# Bank Account Encryption Implementation

## Overview

Bank account details are now encrypted at rest using **AES-256-GCM** encryption, which is the industry standard for sensitive financial data. This implementation ensures compliance with PCI DSS requirements and protects sensitive PII (Personally Identifiable Information).

## What is Encrypted

The following bank account fields are encrypted:
- `bank_account_holder_name` - Account holder name
- `bank_account_number` - Bank account number (most sensitive)
- `bank_ifsc_code` - IFSC code
- `bank_name` - Bank name

## Encryption Details

- **Algorithm**: AES-256-GCM (Advanced Encryption Standard with 256-bit key and Galois/Counter Mode)
- **Key Management**: Uses `ENCRYPTION_KEY` environment variable (32 characters)
- **Format**: Encrypted data is stored as `iv:salt:encrypted:authTag` (hex encoded)
- **Authentication**: GCM mode provides authentication, ensuring data integrity

## Implementation

### Models

Both `Partner` and `Organization` models automatically:
- **Encrypt** bank account fields before storing in the database
- **Decrypt** bank account fields when retrieving from the database
- Handle backward compatibility (can read plain text data during migration)

### Controllers

- `bankAccountController`: Receives plain text from users, models handle encryption
- `payoutController`: Uses decrypted values from models for Razorpay payouts

### Backward Compatibility

The implementation includes backward compatibility:
- If decryption fails, the system assumes the data is plain text (for existing data)
- Logs warnings when plain text is detected
- Migration script can encrypt existing plain text data

## Environment Setup

### Required Environment Variable

Add to your `.env` file:

```env
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

### Generate Encryption Key

You can generate a secure encryption key using:

```javascript
const crypto = require('crypto');
const key = crypto.randomBytes(32).toString('hex').substring(0, 32);
console.log(key);
```

Or use the helper function in `encryptionService.js`:

```javascript
const { generateEncryptionKey } = require('./src/services/encryptionService');
console.log(generateEncryptionKey());
```

**⚠️ IMPORTANT**: 
- Never commit the encryption key to version control
- Store it securely (use environment variables or a secrets manager)
- Use different keys for development and production
- If the key is lost, encrypted data cannot be recovered

## Migration

### Encrypting Existing Data

If you have existing plain text bank account data, run the migration script:

```bash
cd backend
node scripts/encrypt-existing-bank-accounts.js
```

This script will:
1. Find all partners and organizations with bank account data
2. Check if data is already encrypted
3. Encrypt plain text data
4. Update the database
5. Provide a summary of encrypted records

**Before running the migration:**
- Ensure `ENCRYPTION_KEY` is set in your environment
- Backup your database
- Test in a development environment first

## Security Features

1. **Automatic Encryption**: All bank account data is encrypted before database storage
2. **Automatic Decryption**: Data is decrypted when retrieved (transparent to controllers)
3. **Field-Level Encryption**: Each field is encrypted independently
4. **Data Masking**: Account numbers are masked in API responses (last 4 digits visible)
5. **Authentication**: GCM mode ensures data hasn't been tampered with

## API Behavior

### For Users (Partners/Organizations)

- Users submit plain text bank account details via API
- System encrypts and stores encrypted data
- Users receive masked account numbers in responses
- Full details only visible to the account owner (decrypted automatically)

### For Admins

- Admins can view bank account verification status
- Account numbers are masked in admin views
- Full details are decrypted only when needed for payouts

## Testing

### Verify Encryption is Working

1. **Check Database**: Encrypted data should have format `iv:salt:encrypted:authTag`
2. **Check Logs**: No decryption warnings should appear after migration
3. **Test API**: Submit bank account details and verify they're stored encrypted

### Test Decryption

```javascript
const Partner = require('./src/models/Partner');
const partner = await Partner.findById(partnerId);
// partner.bank_account_number should be decrypted (plain text)
```

## Troubleshooting

### Error: "ENCRYPTION_KEY environment variable is not set"

**Solution**: Add `ENCRYPTION_KEY` to your `.env` file

### Error: "ENCRYPTION_KEY must be exactly 32 characters long"

**Solution**: Generate a new 32-character key using the method above

### Warning: "appears to be plain text"

**Solution**: Run the migration script to encrypt existing data

### Decryption Fails

**Possible Causes**:
- Wrong encryption key
- Data was encrypted with a different key
- Data corruption

**Solution**: 
- Verify `ENCRYPTION_KEY` is correct
- Check if data needs to be re-encrypted
- Restore from backup if data is corrupted

## Compliance

This implementation meets:
- **PCI DSS**: Requirement 3.4 - Render PAN unreadable (applies to financial data)
- **Industry Standard**: AES-256-GCM is approved by NIST and used by financial institutions
- **Best Practices**: Field-level encryption with authenticated encryption mode

## Files Modified

- `backend/src/models/Partner.js` - Added encryption/decryption methods
- `backend/src/models/Organization.js` - Added encryption/decryption methods
- `backend/src/services/encryptionService.js` - Already existed, used for encryption
- `backend/scripts/encrypt-existing-bank-accounts.js` - Migration script (new)
- `backend/database/migrations/encrypt_existing_bank_accounts.sql` - Migration documentation (new)

## Future Enhancements

Potential improvements:
1. Key rotation support
2. Hardware Security Module (HSM) integration
3. Audit logging for encryption/decryption operations
4. Performance optimization for bulk operations

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Verify environment configuration
4. Test in development environment first

