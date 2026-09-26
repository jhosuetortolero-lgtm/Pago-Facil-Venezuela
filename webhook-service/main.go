package main

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

const (
	maxWebhookBody = 1 << 20
	maxAPIResponse = 1 << 20
)

var (
	phonePattern       = regexp.MustCompile(`^[0-9]{7,15}$`)
	uuidPattern        = regexp.MustCompile(`^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$`)
	errStoreNotFound   = errors.New("store not found")
	errStorePhoneEmpty = errors.New("store WhatsApp phone is missing or invalid")
)

type config struct {
	port               string
	webhookSecret      string
	supabaseURL        string
	supabaseServiceKey string
	wahaURL            string
	wahaAPIKey         string
	wahaSession        string
	defaultCountryCode string
}

type orderRecord struct {
	ID               string          `json:"id"`
	StoreID          string          `json:"store_id"`
	CustomerName     string          `json:"customer_name"`
	CustomerPhone    string          `json:"customer_phone"`
	TotalUSD         float64         `json:"total_usd"`
	PaymentMethod    string          `json:"payment_method"`
	Status           string          `json:"status"`
	PaymentReference string          `json:"payment_reference"`
	PaymentProofPath string          `json:"payment_proof_path"`
	OCRData          json.RawMessage `json:"ocr_data"`
	CreatedAt        string          `json:"created_at"`
	UpdatedAt        string          `json:"updated_at"`
}

type webhookPayload struct {
	Type      string      `json:"type"`
	Table     string      `json:"table"`
	Schema    string      `json:"schema"`
	Record    orderRecord `json:"record"`
	OldRecord orderRecord `json:"old_record"`
}

type storeRecord struct {
	ID               string `json:"id"`
	Name             string `json:"name"`
	PagoMovilPhone   string `json:"pago_movil_phone"`
	NotificationLang string `json:"-"`
	Currency         string `json:"-"`
}

type wahaMessage struct {
	Session string `json:"session"`
	ChatID  string `json:"chatId"`
	Text    string `json:"text"`
}

type server struct {
	webhookSecret      string
	supabaseURL        string
	supabaseServiceKey string
	wahaURL            string
	wahaAPIKey         string
	wahaSession        string
	defaultCountryCode string
	httpClient         *http.Client
}

func main() {
	if err := godotenv.Load(); err != nil && !os.IsNotExist(err) {
		log.Printf("aviso: no fue posible cargar .env: %v", err)
	}

	cfg, err := loadConfig()
	if err != nil {
		log.Fatal(err)
	}

	gin.SetMode(envOr("GIN_MODE", gin.ReleaseMode))
	s := server{
		webhookSecret:      cfg.webhookSecret,
		supabaseURL:        cfg.supabaseURL,
		supabaseServiceKey: cfg.supabaseServiceKey,
		wahaURL:            cfg.wahaURL,
		wahaAPIKey:         cfg.wahaAPIKey,
		wahaSession:        cfg.wahaSession,
		defaultCountryCode: cfg.defaultCountryCode,
		httpClient:         &http.Client{Timeout: 10 * time.Second},
	}

	httpServer := &http.Server{
		Addr:              ":" + cfg.port,
		Handler:           s.routes(),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}

	log.Printf("PagoFácil Messenger escuchando en http://localhost:%s", cfg.port)
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
}

func loadConfig() (config, error) {
	cfg := config{
		port:               envOr("PORT", "8080"),
		webhookSecret:      strings.TrimSpace(os.Getenv("SUPABASE_WEBHOOK_SECRET")),
		supabaseURL:        strings.TrimRight(strings.TrimSpace(os.Getenv("SUPABASE_URL")), "/"),
		supabaseServiceKey: strings.TrimSpace(os.Getenv("SUPABASE_SECRET_KEY")),
		wahaURL:            strings.TrimRight(strings.TrimSpace(os.Getenv("WAHA_URL")), "/"),
		wahaAPIKey:         strings.TrimSpace(os.Getenv("WAHA_API_KEY")),
		wahaSession:        envOr("WAHA_SESSION", "default"),
		defaultCountryCode: envOr("DEFAULT_COUNTRY_CODE", "58"),
	}
	if cfg.supabaseServiceKey == "" {
		cfg.supabaseServiceKey = strings.TrimSpace(os.Getenv("SUPABASE_SERVICE_ROLE_KEY"))
	}

	required := []struct {
		name  string
		value string
	}{
		{"SUPABASE_WEBHOOK_SECRET", cfg.webhookSecret},
		{"SUPABASE_URL", cfg.supabaseURL},
		{"SUPABASE_SERVICE_ROLE_KEY (o SUPABASE_SECRET_KEY)", cfg.supabaseServiceKey},
		{"WAHA_URL", cfg.wahaURL},
		{"WAHA_API_KEY", cfg.wahaAPIKey},
	}
	for _, item := range required {
		if item.value == "" {
			return config{}, fmt.Errorf("la variable %s es obligatoria", item.name)
		}
	}
	if len(cfg.webhookSecret) < 32 {
		return config{}, errors.New("SUPABASE_WEBHOOK_SECRET debe tener al menos 32 caracteres")
	}
	if err := validateBaseURL("SUPABASE_URL", cfg.supabaseURL); err != nil {
		return config{}, err
	}
	if err := validateBaseURL("WAHA_URL", cfg.wahaURL); err != nil {
		return config{}, err
	}
	port, err := strconv.Atoi(cfg.port)
	if err != nil || port < 1 || port > 65535 {
		return config{}, errors.New("PORT debe ser un número entre 1 y 65535")
	}
	if !regexp.MustCompile(`^[1-9][0-9]{0,2}$`).MatchString(cfg.defaultCountryCode) {
		return config{}, errors.New("DEFAULT_COUNTRY_CODE debe contener entre 1 y 3 dígitos y no comenzar por cero")
	}
	return cfg, nil
}

func validateBaseURL(name, value string) error {
	parsed, err := url.Parse(value)
	if err != nil || parsed.Host == "" || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.RawQuery != "" || parsed.Fragment != "" {
		return fmt.Errorf("%s debe ser una URL HTTP(S) válida sin query ni fragmento", name)
	}
	return nil
}

func (s server) routes() http.Handler {
	router := gin.New()
	router.Use(gin.LoggerWithWriter(os.Stdout, "/health"), gin.Recovery())
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	router.POST("/webhooks/supabase/orders", s.handleOrderWebhook)
	return router
}

func (s server) handleOrderWebhook(c *gin.Context) {
	if !secureEqual(c.GetHeader("X-Supabase-Webhook-Secret"), s.webhookSecret) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}

	payload, status, err := decodeWebhookPayload(c.Writer, c.Request)
	if err != nil {
		c.JSON(status, gin.H{"error": err.Error()})
		return
	}
	if err := validatePayload(payload, s.defaultCountryCode); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if payload.Type == "UPDATE" && payload.OldRecord.Status != "" && payload.OldRecord.Status == payload.Record.Status {
		c.JSON(http.StatusOK, gin.H{"status": "ignored", "reason": "order status did not change"})
		return
	}

	store, err := s.resolveStore(c.Request.Context(), payload.Record.StoreID)
	if err != nil {
		log.Printf("no se pudo enriquecer el pedido %s (store %s): %v", payload.Record.ID, payload.Record.StoreID, err)
		if errors.Is(err, errStoreNotFound) || errors.Is(err, errStorePhoneEmpty) {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": "store notification settings are incomplete"})
			return
		}
		c.JSON(http.StatusBadGateway, gin.H{"error": "store enrichment failed"})
		return
	}

	merchantPhone := normalizePhoneWithCountry(store.PagoMovilPhone, s.defaultCountryCode)
	customerPhone := normalizePhoneWithCountry(payload.Record.CustomerPhone, s.defaultCountryCode)
	merchantMessage := formatMerchantMessage(payload, store, s.defaultCountryCode)
	customerMessage := formatCustomerMessage(payload, store)

	if err := s.sendWAHAMessage(c.Request.Context(), merchantPhone, merchantMessage); err != nil {
		log.Printf("falló la notificación al comercio para el pedido %s: %v", payload.Record.ID, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "merchant notification failed"})
		return
	}
	if err := s.sendWAHAMessage(c.Request.Context(), customerPhone, customerMessage); err != nil {
		log.Printf("falló la notificación al cliente para el pedido %s: %v", payload.Record.ID, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "customer notification failed"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":                "sent",
		"merchant_notification": true,
		"customer_notification": true,
	})
}

func decodeWebhookPayload(writer http.ResponseWriter, request *http.Request) (webhookPayload, int, error) {
	if request.ContentLength > maxWebhookBody {
		return webhookPayload{}, http.StatusRequestEntityTooLarge, errors.New("payload too large")
	}
	request.Body = http.MaxBytesReader(writer, request.Body, maxWebhookBody)
	decoder := json.NewDecoder(request.Body)
	var payload webhookPayload
	if err := decoder.Decode(&payload); err != nil {
		var maxBytesError *http.MaxBytesError
		if errors.As(err, &maxBytesError) {
			return webhookPayload{}, http.StatusRequestEntityTooLarge, errors.New("payload too large")
		}
		return webhookPayload{}, http.StatusBadRequest, errors.New("invalid payload")
	}
	var trailing any
	if err := decoder.Decode(&trailing); !errors.Is(err, io.EOF) {
		return webhookPayload{}, http.StatusBadRequest, errors.New("payload must contain a single JSON object")
	}
	return payload, http.StatusOK, nil
}

func validatePayload(payload webhookPayload, defaultCountryCode string) error {
	if payload.Type != "INSERT" && payload.Type != "UPDATE" {
		return errors.New("unsupported webhook type")
	}
	if payload.Table != "orders" {
		return errors.New("table must be orders")
	}
	if payload.Schema != "public" {
		return errors.New("schema must be public")
	}
	if !uuidPattern.MatchString(payload.Record.ID) {
		return errors.New("record.id must be a valid UUID")
	}
	if !uuidPattern.MatchString(payload.Record.StoreID) {
		return errors.New("record.store_id must be a valid UUID")
	}
	if payload.Record.TotalUSD <= 0 {
		return errors.New("record.total_usd must be positive")
	}
	if _, ok := paymentMethodLabels[payload.Record.PaymentMethod]; !ok {
		return errors.New("unsupported payment_method")
	}
	if _, ok := statusLabels[payload.Record.Status]; !ok {
		return errors.New("unsupported status")
	}
	if normalizePhoneWithCountry(payload.Record.CustomerPhone, defaultCountryCode) == "" {
		return errors.New("record.customer_phone is required and must use international format")
	}
	return nil
}

func (s server) resolveStore(ctx context.Context, storeID string) (storeRecord, error) {
	endpoint, err := url.Parse(s.supabaseURL + "/rest/v1/stores")
	if err != nil {
		return storeRecord{}, fmt.Errorf("build Supabase URL: %w", err)
	}
	query := endpoint.Query()
	query.Set("id", "eq."+storeID)
	query.Set("select", "id,name,pago_movil_phone")
	query.Set("limit", "1")
	endpoint.RawQuery = query.Encode()

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, endpoint.String(), nil)
	if err != nil {
		return storeRecord{}, fmt.Errorf("create Supabase request: %w", err)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Accept-Profile", "public")
	request.Header.Set("apikey", s.supabaseServiceKey)
	request.Header.Set("Authorization", "Bearer "+s.supabaseServiceKey)
	request.Header.Set("User-Agent", "pagofacil-webhook-service/1.0")

	response, err := s.httpClient.Do(request)
	if err != nil {
		return storeRecord{}, fmt.Errorf("query Supabase: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return storeRecord{}, fmt.Errorf("Supabase returned HTTP %d: %s", response.StatusCode, readResponseSnippet(response.Body))
	}

	var stores []storeRecord
	decoder := json.NewDecoder(io.LimitReader(response.Body, maxAPIResponse))
	if err := decoder.Decode(&stores); err != nil {
		return storeRecord{}, fmt.Errorf("decode Supabase response: %w", err)
	}
	if len(stores) == 0 {
		return storeRecord{}, errStoreNotFound
	}
	store := stores[0]
	if normalizePhoneWithCountry(store.PagoMovilPhone, s.defaultCountryCode) == "" {
		return storeRecord{}, errStorePhoneEmpty
	}
	store.NotificationLang = "es"
	store.Currency = "USD"
	return store, nil
}

func (s server) sendWAHAMessage(ctx context.Context, phone, message string) error {
	if normalizePhone(phone) == "" {
		return errors.New("invalid destination phone")
	}
	body, err := json.Marshal(wahaMessage{
		Session: s.wahaSession,
		ChatID:  normalizePhone(phone) + "@c.us",
		Text:    message,
	})
	if err != nil {
		return fmt.Errorf("encode WAHA message: %w", err)
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodPost, s.wahaURL+"/api/sendText", strings.NewReader(string(body)))
	if err != nil {
		return fmt.Errorf("create WAHA request: %w", err)
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Api-Key", s.wahaAPIKey)
	request.Header.Set("User-Agent", "pagofacil-webhook-service/1.0")

	response, err := s.httpClient.Do(request)
	if err != nil {
		return fmt.Errorf("call WAHA: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("WAHA returned HTTP %d: %s", response.StatusCode, readResponseSnippet(response.Body))
	}
	return nil
}

var paymentMethodLabels = map[string]string{
	"zelle":       "Zelle",
	"pago_movil":  "Pago Móvil",
	"binance_pay": "Binance Pay (USDT)",
}

var statusLabels = map[string]string{
	"pending":               "Pendiente de verificación",
	"verified":              "Pago verificado",
	"manual_review":         "En revisión manual",
	"fraud_alert":           "Requiere revisión",
	"fraud_alert_duplicate": "Comprobante duplicado",
	"cancelled":             "Cancelado",
}

func formatMerchantMessage(payload webhookPayload, store storeRecord, defaultCountryCode string) string {
	order := payload.Record
	title := "🛍️ *¡Nuevo pedido recibido!*"
	statusLine := statusLabels[order.Status]
	if payload.Type == "UPDATE" {
		title = "🔔 *Pedido actualizado*"
		if previous := statusLabels[payload.OldRecord.Status]; previous != "" {
			statusLine = previous + " → " + statusLine
		}
	}
	return fmt.Sprintf(
		"%s\n\n🏪 Tienda: %s\n👤 Cliente: %s\n📱 WhatsApp: %s\n💰 Total: USD %.2f\n💳 Método: %s\n📌 Estado: %s\n🧾 Pedido: #%s",
		title,
		cleanText(store.Name, "Tu tienda"),
		cleanText(order.CustomerName, "Cliente"),
		normalizePhoneWithCountry(order.CustomerPhone, defaultCountryCode),
		order.TotalUSD,
		paymentMethodLabels[order.PaymentMethod],
		statusLine,
		shortOrderID(order.ID),
	)
}

func formatCustomerMessage(payload webhookPayload, store storeRecord) string {
	order := payload.Record
	name := cleanText(order.CustomerName, "Cliente")
	storeName := cleanText(store.Name, "nuestra tienda")
	if payload.Type == "UPDATE" {
		statusMessage := map[string]string{
			"pending":               "Tu pedido continúa pendiente de verificación.",
			"verified":              "✅ Tu pago fue confirmado y tu pedido está aprobado.",
			"manual_review":         "⏳ Estamos revisando tu comprobante manualmente.",
			"fraud_alert":           "⚠️ Necesitamos revisar tu comprobante. La tienda se comunicará contigo.",
			"fraud_alert_duplicate": "⚠️ El comprobante requiere una revisión adicional. La tienda se comunicará contigo.",
			"cancelled":             "El pedido fue cancelado. Contacta a la tienda si necesitas ayuda.",
		}[order.Status]
		return fmt.Sprintf(
			"👋 Hola, %s.\n\n%s\n\n🏪 Tienda: %s\n💰 Total: USD %.2f\n🧾 Pedido: #%s",
			name,
			statusMessage,
			storeName,
			order.TotalUSD,
			shortOrderID(order.ID),
		)
	}
	return fmt.Sprintf(
		"👋 Hola, %s.\n\n✅ Hemos recibido tu pedido en *%s*.\n\n💰 Total: USD %.2f\n💳 Método: %s\n🧾 Pedido: #%s\n\nTe avisaremos por este medio cuando el pago sea verificado.",
		name,
		storeName,
		order.TotalUSD,
		paymentMethodLabels[order.PaymentMethod],
		shortOrderID(order.ID),
	)
}

func secureEqual(provided, expected string) bool {
	if provided == "" || expected == "" {
		return false
	}
	providedDigest := sha256.Sum256([]byte(provided))
	expectedDigest := sha256.Sum256([]byte(expected))
	return subtle.ConstantTimeCompare(providedDigest[:], expectedDigest[:]) == 1
}

func normalizePhone(phone string) string {
	return normalizePhoneWithCountry(phone, "")
}

func normalizePhoneWithCountry(phone, defaultCountryCode string) string {
	var digits strings.Builder
	for _, char := range strings.TrimSpace(phone) {
		switch {
		case char >= '0' && char <= '9':
			digits.WriteRune(char)
		case strings.ContainsRune(" +()-.", char):
			continue
		default:
			return ""
		}
	}
	value := strings.TrimPrefix(digits.String(), "00")
	if strings.HasPrefix(value, "0") {
		if defaultCountryCode == "" {
			return ""
		}
		value = defaultCountryCode + strings.TrimPrefix(value, "0")
	}
	if !phonePattern.MatchString(value) {
		return ""
	}
	return value
}

func cleanText(value, fallback string) string {
	value = strings.NewReplacer("\r", " ", "\n", " ", "\t", " ", "*", "").Replace(value)
	value = strings.Join(strings.Fields(value), " ")
	if value == "" {
		return fallback
	}
	runes := []rune(value)
	if len(runes) > 120 {
		value = string(runes[:120])
	}
	return value
}

func shortOrderID(id string) string {
	if len(id) <= 8 {
		return id
	}
	return id[:8]
}

func readResponseSnippet(reader io.Reader) string {
	body, err := io.ReadAll(io.LimitReader(reader, 512))
	if err != nil {
		return "unreadable response"
	}
	value := strings.Join(strings.Fields(string(body)), " ")
	if value == "" {
		return "empty response"
	}
	return value
}

func envOr(key, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}
