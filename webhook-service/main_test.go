package main

import "testing"

func TestValidatePayload(t *testing.T) {
	payload := webhookPayload{Type: "UPDATE", Table: "orders", Schema: "public", Record: orderRecord{ID: "order-1", StoreID: "store-1", StorePhone: "+584121234567", TotalUSD: 12.5, PaymentMethod: "binance_pay", Status: "verified"}}
	if err := validatePayload(payload); err != nil {
		t.Fatalf("valid payload rejected: %v", err)
	}
	payload.Record.Status = "pending"
	if err := validatePayload(payload); err == nil {
		t.Fatal("unsupported status accepted")
	}
}

func TestNormalizePhone(t *testing.T) {
	if got := normalizePhone("+58 412-1234567"); got != "584121234567" {
		t.Fatalf("unexpected phone: %s", got)
	}
	if got := normalizePhone("abc"); got != "" {
		t.Fatalf("invalid phone accepted: %s", got)
	}
}
