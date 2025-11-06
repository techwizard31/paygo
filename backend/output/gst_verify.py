import re

def char_to_code(c):
    """Convert alphanumeric char to base-36 code."""
    if c.isdigit():
        return int(c)
    else:
        return ord(c.upper()) - ord('A') + 10

def code_to_char(code):
    """Convert base-36 code back to alphanumeric char."""
    if code < 10:
        return str(code)
    else:
        return chr(code - 10 + ord('A'))

def verify_gstin(gstin):
    """Verify if a GSTIN is valid based on format and checksum."""
    if len(gstin) != 15:
        return False
    
    gstin = gstin.upper()
    
    # Format validation with regex
    # State code: 01-37 (basic range check)
    # PAN: 5 letters + 4 digits + 1 letter
    # Entity: 1 alphanumeric
    # 14th: Z
    # 15th: Checksum (alphanumeric)
    pattern = r'^([0][1-9]|[1-2][0-9]|[3][0-7])[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]$'
    if not re.match(pattern, gstin):
        return False
    
    # Checksum calculation
    total = 0
    for i in range(14):
        c = gstin[i]
        code = char_to_code(c)
        multiplier = 1 if (i % 2 == 0) else 2
        product = code * multiplier
        quotient = product // 36
        remainder = product % 36
        hash_val = quotient + remainder
        total += hash_val
    
    z = total % 36
    y = (36 - z) % 36
    expected_checksum = code_to_char(y)
    
    return expected_checksum == gstin[14]

# Example usage
if __name__ == "__main__":
    test_gstin = "27AAPFU0939F1ZV"  # Valid example
    print(f"Is {test_gstin} valid? {verify_gstin(test_gstin)}")
    
    invalid_gstin = "27AAPFU0939F1ZW"  # Invalid checksum
    print(f"Is {invalid_gstin} valid? {verify_gstin(invalid_gstin)}")