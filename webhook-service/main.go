package main

import (
	"crypto/subtle"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

const maxWebhookBody = 1 << 20

var phonePattern = regexp.MustCompile(`^[0-9]{7,15}$`)

type orderRecord struct {
	ID            string  `json:"id"`
	StoreID       string  `json:"store_id"`
	StoreName     string  `json:"store_name"`
	StorePhone    string  `json:"store_phone"`
	MerchantPhone string  `json:"merchant_phone"`
	CustomerName  string  `json:"customer_name"`
	TotalUSD      float64 `json:"total_usd"`
	PaymentMethod string  `json:"payment_method"`
	PaymentRef    string  `json:"payment_reference"`
	Status        string  `json:"status"`
}

type webhookPayload struct {
	Type      string      `json:"type"`
	Table     string      `json:"table"`
	Schema    string      `json:"schema"`
	Record    orderRecord `json:"record"`
	OldRecord orderRecord `json:"old_record"`
}

type wahaMessage struct {
	Session string `json:"session"`
	ChatID  string `json:"chatId"`
	Text    string `json:"text"`
}

type server struct {
	webhookSecret string
	wahaURL       string
	wahaAPIKey    string
	wahaSession   string
	httpClient    *http.Client
}

func main() {
	s := server{
		webhookSecret: os.Getenv("SUPABASE_WEBHOOK_SECRET"),
		wahaURL:       strings.TrimRight(os.Getenv("WAHA_URL"), "/"),
		wahaAPIKey:    os.Getenv("WAHA_API_KEY"),
		wahaSession:   envOr("WAHA_SESSION", "default"),
		httpClient:    &http.Client{Timeout: 10 * time.Second},
	}
	if s.webhookSecret == "" || s.wahaURL == "" || s.wahaAPIKey == "" {
		log.Fatal("SUPABASE_WEBHOOK_SECRET, WAHA_URL e WAHA_API_KEY são obrigatórios")
	}

	gin.SetMode(envOr("GIN_MODE", gin.ReleaseMode))
	router := gin.New()
	router.Use(gin.Recovery())
	router.GET("/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	router.POST("/webhooks/supabase/orders", s.handleOrderWebhook)

	port := envOr("PORT", "8080")
	log.Printf("serviço de mensageria escutando na porta %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal(err)
	}
}

func (s server) handleOrderWebhook(c *gin.Context) {
	provided := c.GetHeader("X-Supabase-Webhook-Secret")
	if provided == "" || subtle.ConstantTimeCompare([]byte(provided), []byte(s.webhookSecret)) != 1 {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
		return
	}
	if c.Request.ContentLength > maxWebhookBody {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "payload too large"})
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxWebhookBody)
	var payload webhookPayload
	decoder := json.NewDecoder(c.Request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}
	if err := validatePayload(payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if err := s.notifyMerchant(payload.Record); err != nil {
		log.Printf("falha ao notificar pedido %s: %v", payload.Record.ID, err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "notification failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "sent"})
}

func validatePayload(payload webhookPayload) error {
	if payload.Type != "INSERT" && payload.Type != "UPDATE" {
		return errors.New("unsupported webhook type")
	}
	if payload.Table != "orders" {
		return errors.New("table must be orders")
	}
	if payload.Schema != "public" {
		return errors.New("schema must be public")
	}
	if payload.Record.ID == "" || len(payload.Record.ID) > 80 {
		return errors.New("record.id is required")
	}
	if payload.Record.StoreID == "" || len(payload.Record.StoreID) > 80 {
		return errors.New("record.store_id is required")
	}
	if payload.Record.TotalUSD <= 0 {
		return errors.New("record.total_usd must be positive")
	}
	if payload.Record.PaymentMethod != "zelle" && payload.Record.PaymentMethod != "pago_movil" && payload.Record.PaymentMethod != "binance_pay" {
		return errors.New("unsupported payment_method")
	}
	if payload.Record.Status != "verified" && payload.Record.Status != "manual_review" && payload.Record.Status != "fraud_alert_duplicate" && payload.Record.Status != "fraud_alert" {
		return errors.New("unsupported status")
	}
	if normalizePhone(payload.Record.StorePhone) == "" && normalizePhone(payload.Record.MerchantPhone) == "" {
		return errors.New("merchant phone is required")
	}
	return nil
}

func (s server) notifyMerchant(order orderRecord) error {
	phone := normalizePhone(order.StorePhone)
	if phone == "" {
		phone = normalizePhone(order.MerchantPhone)
	}
	msg := formatMessage(order)
	body, err := json.Marshal(wahaMessage{Session: s.wahaSession, ChatID: phone + "@c.us", Text: msg})
	if err != nil {
		return err
	}
	req, err := http.NewRequest(http.MethodPost, s.wahaURL+"/api/sendText", strings.NewReader(string(body)))
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Api-Key", s.wahaAPIKey)
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("WAHA returned status %d", resp.StatusCode)
	}
	return nil
}

func formatMessage(order orderRecord) string {
	status := map[string]string{"verified": "✅ Pago verificado", "manual_review": "⏳ Pago en revisión manual", "fraud_alert_duplicate": "🚨 Alerta: comprobante reutilizado", "fraud_alert": "🚨 Alerta de fraude"}[order.Status]
	method := map[string]string{"zelle": "Zelle", "pago_movil": "Pago Móvil", "binance_pay": "Binance Pay (USDT)"}[order.PaymentMethod]
	customer := order.CustomerName
	if customer == "" {
		customer = "Cliente"
	}
	return fmt.Sprintf("%s\n\nNueva venta en %s\nCliente: %s\nMonto: $%.2f USD\nMétodo: %s\nPedido: %s", status, order.StoreNameOrDefault(), customer, order.TotalUSD, method, order.ID)
}

func (o orderRecord) StoreNameOrDefault() string {
	if o.StoreName == "" {
		return "tu tienda"
	}
	return o.StoreName
}

func normalizePhone(phone string) string {
	phone = strings.TrimSpace(phone)
	phone = strings.TrimPrefix(phone, "+")
	phone = strings.ReplaceAll(phone, " ", "")
	phone = strings.ReplaceAll(phone, "-", "")
	if !phonePattern.MatchString(phone) {
		return ""
	}
	return phone
}
func envOr(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
