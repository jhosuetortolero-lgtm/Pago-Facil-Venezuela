package main

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
)

const (
	testOrderID  = "11111111-1111-4111-8111-111111111111"
	testStoreID  = "22222222-2222-4222-8222-222222222222"
	testSecret   = "0123456789abcdef0123456789abcdef"
	testAPIKey   = "service-role-key"
	testWahaKey  = "waha-api-key"
	testSession  = "store-session"
	merchantChat = "584121111111@c.us"
	customerChat = "584122222222@c.us"
)

func init() {
	gin.SetMode(gin.TestMode)
}

func validPayload() webhookPayload {
	return webhookPayload{
		Type:   "INSERT",
		Table:  "orders",
		Schema: "public",
		Record: orderRecord{
			ID:            testOrderID,
			StoreID:       testStoreID,
			CustomerName:  "María",
			CustomerPhone: "+58 412-2222222",
			TotalUSD:      25.50,
			PaymentMethod: "pago_movil",
			Status:        "pending",
		},
	}
}

func TestValidatePayloadAllowsStoreEnrichment(t *testing.T) {
	payload := validPayload()
	if err := validatePayload(payload, "58"); err != nil {
		t.Fatalf("valid payload rejected: %v", err)
	}

	payload.Record.Status = "unknown"
	if err := validatePayload(payload, "58"); err == nil {
		t.Fatal("unsupported status accepted")
	}
}

func TestNormalizePhone(t *testing.T) {
	tests := map[string]string{
		"+58 412-1234567":     "584121234567",
		"0055 (81) 8178-4001": "558181784001",
		"0412-1234567":        "",
		"abc":                 "",
	}
	for input, expected := range tests {
		if got := normalizePhone(input); got != expected {
			t.Fatalf("normalizePhone(%q) = %q, want %q", input, got, expected)
		}
	}
	if got := normalizePhoneWithCountry("0412-1234567", "58"); got != "584121234567" {
		t.Fatalf("local phone normalization = %q, want %q", got, "584121234567")
	}
}

func TestSecureEqual(t *testing.T) {
	if !secureEqual(testSecret, testSecret) {
		t.Fatal("matching secrets were rejected")
	}
	if secureEqual("wrong", testSecret) || secureEqual("", testSecret) {
		t.Fatal("invalid secret was accepted")
	}
}

func TestResolveStoreUsesServiceRoleKey(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		if request.URL.Path != "/rest/v1/stores" {
			t.Fatalf("unexpected path: %s", request.URL.Path)
		}
		if got := request.URL.Query().Get("id"); got != "eq."+testStoreID {
			t.Fatalf("unexpected store filter: %s", got)
		}
		if got := request.URL.Query().Get("select"); got != "*" {
			t.Fatalf("unexpected store select: %s", got)
		}
		if got := request.Header.Get("apikey"); got != testAPIKey {
			t.Fatalf("unexpected apikey header: %s", got)
		}
		if got := request.Header.Get("Authorization"); got != "Bearer "+testAPIKey {
			t.Fatalf("unexpected authorization header: %s", got)
		}
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`[{"id":"` + testStoreID + `","name":"Mi Tienda","whatsapp_phone":"+58 412-3333333","phone":"+58 412-2222222","pago_movil_phone":"+58 412-1111111"}]`))
	}))
	defer upstream.Close()

	s := server{supabaseURL: upstream.URL, supabaseServiceKey: testAPIKey, defaultCountryCode: "58", httpClient: &http.Client{Timeout: time.Second}}
	store, err := s.resolveStore(context.Background(), testStoreID)
	if err != nil {
		t.Fatalf("resolveStore failed: %v", err)
	}
	if store.Name != "Mi Tienda" || store.MerchantPhone != "584123333333" || store.MerchantPhoneSource != "whatsapp_phone" {
		t.Fatalf("unexpected store: %#v", store)
	}
}

func TestSelectStorePhonePriority(t *testing.T) {
	tests := []struct {
		name       string
		payload    string
		wantPhone  string
		wantSource string
	}{
		{
			name:       "whatsapp before all other columns",
			payload:    `{"whatsapp_phone":"0412-3333333","phone":"0412-2222222","pago_movil_phone":"0412-1111111"}`,
			wantPhone:  "584123333333",
			wantSource: "whatsapp_phone",
		},
		{
			name:       "phone when whatsapp is invalid",
			payload:    `{"whatsapp_phone":"invalid","phone":"0412-2222222","pago_movil_phone":"0412-1111111"}`,
			wantPhone:  "584122222222",
			wantSource: "phone",
		},
		{
			name:       "pago movil as third choice",
			payload:    `{"pago_movil_phone":"0412-1111111"}`,
			wantPhone:  "584121111111",
			wantSource: "pago_movil_phone",
		},
		{
			name:       "additional contact phone column",
			payload:    `{"support_phone":"0412-4444444"}`,
			wantPhone:  "584124444444",
			wantSource: "support_phone",
		},
		{
			name:       "numeric contact number",
			payload:    `{"contact_number":584125555555}`,
			wantPhone:  "584125555555",
			wantSource: "contact_number",
		},
		{
			name:      "unrelated numeric fields are ignored",
			payload:   `{"pago_movil_id":"123456789"}`,
			wantPhone: "",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			var fields map[string]json.RawMessage
			if err := json.Unmarshal([]byte(test.payload), &fields); err != nil {
				t.Fatalf("decode test payload: %v", err)
			}
			phone, source := selectStorePhone(fields, "58")
			if phone != test.wantPhone || source != test.wantSource {
				t.Fatalf("selectStorePhone() = (%q, %q), want (%q, %q)", phone, source, test.wantPhone, test.wantSource)
			}
		})
	}
}

func TestResolveStoreUsesDefaultMerchantPhone(t *testing.T) {
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, _ *http.Request) {
		writer.Header().Set("Content-Type", "application/json")
		_, _ = writer.Write([]byte(`[{"id":"` + testStoreID + `","name":"Mi Tienda"}]`))
	}))
	defer upstream.Close()

	s := server{
		supabaseURL:          upstream.URL,
		supabaseServiceKey:   testAPIKey,
		defaultCountryCode:   "58",
		defaultMerchantPhone: "0412-9999999",
		httpClient:           &http.Client{Timeout: time.Second},
	}
	store, err := s.resolveStore(context.Background(), testStoreID)
	if err != nil {
		t.Fatalf("resolveStore failed: %v", err)
	}
	if store.MerchantPhone != "584129999999" || store.MerchantPhoneSource != "DEFAULT_MERCHANT_PHONE" {
		t.Fatalf("unexpected fallback store: %#v", store)
	}
}

func TestWebhookRejectsInvalidSecretBeforeExternalCalls(t *testing.T) {
	var calls atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		calls.Add(1)
		writer.WriteHeader(http.StatusInternalServerError)
	}))
	defer upstream.Close()

	s := testServer(upstream.URL)
	body, _ := json.Marshal(validPayload())
	request := httptest.NewRequest(http.MethodPost, "/webhooks/supabase/orders", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Supabase-Webhook-Secret", "wrong")
	response := httptest.NewRecorder()

	s.routes().ServeHTTP(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
	if calls.Load() != 0 {
		t.Fatalf("external service called %d times", calls.Load())
	}
}

func TestWebhookEnrichesOrderAndNotifiesMerchantAndCustomer(t *testing.T) {
	var mutex sync.Mutex
	var messages []wahaMessage
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/rest/v1/stores":
			if request.Header.Get("apikey") != testAPIKey {
				writer.WriteHeader(http.StatusUnauthorized)
				return
			}
			writer.Header().Set("Content-Type", "application/json")
			_, _ = writer.Write([]byte(`[{"id":"` + testStoreID + `","name":"Mi Tienda","pago_movil_phone":"+58 412-1111111"}]`))
		case "/api/sendText":
			if request.Header.Get("X-Api-Key") != testWahaKey {
				writer.WriteHeader(http.StatusUnauthorized)
				return
			}
			var message wahaMessage
			if err := json.NewDecoder(request.Body).Decode(&message); err != nil {
				t.Fatalf("decode WAHA message: %v", err)
			}
			mutex.Lock()
			messages = append(messages, message)
			mutex.Unlock()
			writer.Header().Set("Content-Type", "application/json")
			_, _ = writer.Write([]byte(`{"id":"message-id"}`))
		default:
			writer.WriteHeader(http.StatusNotFound)
		}
	}))
	defer upstream.Close()

	s := testServer(upstream.URL)
	body, _ := json.Marshal(validPayload())
	request := httptest.NewRequest(http.MethodPost, "/webhooks/supabase/orders", bytes.NewReader(body))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Supabase-Webhook-Secret", testSecret)
	response := httptest.NewRecorder()

	s.routes().ServeHTTP(response, request)
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if len(messages) != 2 {
		t.Fatalf("sent %d messages, want 2", len(messages))
	}
	if messages[0].ChatID != merchantChat || !strings.Contains(messages[0].Text, "¡Nuevo pedido recibido!") {
		t.Fatalf("unexpected merchant message: %#v", messages[0])
	}
	if messages[1].ChatID != customerChat || !strings.Contains(messages[1].Text, "Hemos recibido tu pedido") {
		t.Fatalf("unexpected customer message: %#v", messages[1])
	}
	for _, message := range messages {
		if message.Session != testSession {
			t.Fatalf("unexpected WAHA session: %s", message.Session)
		}
	}
}

func TestWebhookContinuesWithoutMerchantPhone(t *testing.T) {
	var mutex sync.Mutex
	var messages []wahaMessage
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		switch request.URL.Path {
		case "/rest/v1/stores":
			writer.Header().Set("Content-Type", "application/json")
			_, _ = writer.Write([]byte(`[{"id":"` + testStoreID + `","name":"Mi Tienda"}]`))
		case "/api/sendText":
			var message wahaMessage
			if err := json.NewDecoder(request.Body).Decode(&message); err != nil {
				t.Fatalf("decode WAHA message: %v", err)
			}
			mutex.Lock()
			messages = append(messages, message)
			mutex.Unlock()
			writer.Header().Set("Content-Type", "application/json")
			_, _ = writer.Write([]byte(`{"id":"message-id"}`))
		default:
			writer.WriteHeader(http.StatusNotFound)
		}
	}))
	defer upstream.Close()

	body, _ := json.Marshal(validPayload())
	request := httptest.NewRequest(http.MethodPost, "/webhooks/supabase/orders", bytes.NewReader(body))
	request.Header.Set("X-Supabase-Webhook-Secret", testSecret)
	response := httptest.NewRecorder()
	testServer(upstream.URL).routes().ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", response.Code, response.Body.String())
	}
	if len(messages) != 1 || messages[0].ChatID != customerChat {
		t.Fatalf("unexpected messages: %#v", messages)
	}
	if !strings.Contains(response.Body.String(), `"merchant_notification":false`) || !strings.Contains(response.Body.String(), `"customer_notification":true`) {
		t.Fatalf("unexpected response body: %s", response.Body.String())
	}
}

func TestWebhookIgnoresUpdateWithoutStatusChange(t *testing.T) {
	var calls atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		calls.Add(1)
		writer.WriteHeader(http.StatusInternalServerError)
	}))
	defer upstream.Close()

	payload := validPayload()
	payload.Type = "UPDATE"
	payload.OldRecord.Status = payload.Record.Status
	body, _ := json.Marshal(payload)
	request := httptest.NewRequest(http.MethodPost, "/webhooks/supabase/orders", bytes.NewReader(body))
	request.Header.Set("X-Supabase-Webhook-Secret", testSecret)
	response := httptest.NewRecorder()

	testServer(upstream.URL).routes().ServeHTTP(response, request)
	if response.Code != http.StatusOK || !strings.Contains(response.Body.String(), `"status":"ignored"`) {
		t.Fatalf("unexpected response: status=%d body=%s", response.Code, response.Body.String())
	}
	if calls.Load() != 0 {
		t.Fatalf("external service called %d times", calls.Load())
	}
}

func testServer(upstreamURL string) server {
	return server{
		webhookSecret:      testSecret,
		supabaseURL:        upstreamURL,
		supabaseServiceKey: testAPIKey,
		wahaURL:            upstreamURL,
		wahaAPIKey:         testWahaKey,
		wahaSession:        testSession,
		defaultCountryCode: "58",
		httpClient:         &http.Client{Timeout: time.Second},
	}
}
