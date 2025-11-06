"""
Currency Converter Module
Converts all amounts to Indian Rupees (INR) using live exchange rates
"""

import requests
from datetime import datetime, timedelta
from typing import Optional, Dict


class CurrencyConverter:
    """
    Currency converter with caching for efficient API usage.
    Uses ExchangeRate-API for live exchange rates.
    """
    
    def __init__(self):
        self.cache: Dict[str, tuple] = {}
        self.cache_duration = timedelta(hours=1)
        self.api_url = "https://api.exchangerate-api.com/v4/latest/{}"
    
    def get_rate(self, from_currency: str) -> float:
        """
        Get exchange rate from specified currency to INR.
        
        Args:
            from_currency: Source currency code (e.g., 'USD', 'EUR')
        
        Returns:
            float: Exchange rate to INR
        """
        from_currency = from_currency.upper().strip()
        
        # If already in INR, no conversion needed
        if from_currency == 'INR':
            return 1.0
        
        # Check cache first
        if from_currency in self.cache:
            rate, timestamp = self.cache[from_currency]
            if datetime.now() - timestamp < self.cache_duration:
                print(f"💰 Using cached rate: 1 {from_currency} = {rate} INR")
                return rate
        
        # Fetch new rate from API
        try:
            print(f"🌐 Fetching live exchange rate for {from_currency}...")
            url = self.api_url.format(from_currency)
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            inr_rate = data['rates']['INR']
            
            # Update cache
            self.cache[from_currency] = (inr_rate, datetime.now())
            print(f"✅ Live rate: 1 {from_currency} = {inr_rate} INR")
            
            return inr_rate
            
        except requests.exceptions.RequestException as e:
            print(f"⚠️  API request failed: {e}")
            # Fallback to static rates if API fails
            return self._get_fallback_rate(from_currency)
        except (KeyError, ValueError) as e:
            print(f"⚠️  Error parsing API response: {e}")
            return self._get_fallback_rate(from_currency)
    
    def _get_fallback_rate(self, from_currency: str) -> float:
        """
        Fallback exchange rates (updated as of Nov 2024).
        Used when API is unavailable.
        """
        fallback_rates = {
            'USD': 83.12,
            'EUR': 89.50,
            'GBP': 105.20,
            'AED': 22.63,
            'SGD': 61.80,
            'JPY': 0.56,
            'AUD': 54.20,
            'CAD': 60.50,
            'CHF': 94.30,
            'CNY': 11.50,
            'INR': 1.0
        }
        
        if from_currency in fallback_rates:
            rate = fallback_rates[from_currency]
            print(f"⚠️  Using fallback rate: 1 {from_currency} = {rate} INR")
            return rate
        else:
            print(f"❌ Currency {from_currency} not supported in fallback rates")
            raise ValueError(f"Unsupported currency: {from_currency}")
    
    def convert_to_inr(self, amount: float, from_currency: str) -> float:
        """
        Convert amount from specified currency to INR.
        
        Args:
            amount: Amount in source currency
            from_currency: Source currency code
        
        Returns:
            float: Amount in INR (rounded to 2 decimals)
        """
        if amount is None or amount == 0:
            return 0.0
        
        rate = self.get_rate(from_currency)
        inr_amount = round(amount * rate, 2)
        
        return inr_amount
    
    def convert_invoice_to_inr(self, invoice_data: dict) -> dict:
        """
        Convert all monetary amounts in invoice to INR and remove currency field.
        
        Args:
            invoice_data: Dictionary containing invoice data with currency field
        
        Returns:
            dict: Updated invoice data with amounts in INR, currency field removed
        """
        # Extract currency
        currency_field = invoice_data.get('currency', {})
        currency = currency_field.get('value', 'INR')
        
        # Skip if currency is nil or invalid
        if not currency or currency.lower() == 'nil':
            print("⚠️  No valid currency found, assuming INR")
            currency = 'INR'
        
        print(f"\n💱 Converting from {currency} to INR...")
        
        # Convert total_amount
        if 'total_amount' in invoice_data:
            original_total = invoice_data['total_amount'].get('value', 0)
            if original_total and original_total != 'nil':
                try:
                    original_total = float(original_total)
                    converted_total = self.convert_to_inr(original_total, currency)
                    invoice_data['total_amount']['value'] = converted_total
                    print(f"   Total: {original_total} {currency} → ₹{converted_total}")
                except (ValueError, TypeError) as e:
                    print(f"   ⚠️  Could not convert total_amount: {e}")
        
        # Convert tax_amount
        if 'tax_amount' in invoice_data:
            original_tax = invoice_data['tax_amount'].get('value', 0)
            if original_tax and original_tax != 'nil':
                try:
                    original_tax = float(original_tax)
                    converted_tax = self.convert_to_inr(original_tax, currency)
                    invoice_data['tax_amount']['value'] = converted_tax
                    print(f"   Tax: {original_tax} {currency} → ₹{converted_tax}")
                except (ValueError, TypeError) as e:
                    print(f"   ⚠️  Could not convert tax_amount: {e}")
        
        # Remove currency field
        if 'currency' in invoice_data:
            del invoice_data['currency']
            print(f"   ✅ Removed currency field")
        
        print(f"✅ Currency conversion complete\n")
        
        return invoice_data


# Convenience function for direct use
def convert_invoice_to_inr(invoice_data: dict) -> dict:
    """
    Convert invoice amounts to INR and remove currency field.
    
    Args:
        invoice_data: Invoice data dictionary
    
    Returns:
        dict: Invoice with amounts in INR
    """
    converter = CurrencyConverter()
    return converter.convert_invoice_to_inr(invoice_data)


if __name__ == "__main__":
    # Test the converter
    import json
    
    test_invoice = {
        "invoice_number": {"value": "INV-001", "confidence": 0.95},
        "total_amount": {"value": 100.0, "confidence": 0.9},
        "tax_amount": {"value": 18.0, "confidence": 0.9},
        "currency": {"value": "USD", "confidence": 0.8}
    }
    
    print("Original Invoice:")
    print(json.dumps(test_invoice, indent=2))
    
    converted = convert_invoice_to_inr(test_invoice)
    
    print("\nConverted Invoice (INR):")
    print(json.dumps(converted, indent=2))
