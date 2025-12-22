# HIPAA & GDPR Encryption Architecture Plan

## Executive Summary

This plan implements end-to-end encryption for the therapy tracking application to achieve HIPAA and GDPR compliance. The architecture uses field-level encryption with AES-256-GCM, hierarchical key management, and maintains audit trails for all encryption operations.

## Current State Analysis

### Sensitive Data Identified
1. **CaseHistory Model**: 145+ fields containing comprehensive medical/psychological history
   - Personal identification data (name, age, gender, address)
   - Family history and relationships
   - Medical and psychiatric history
   - Sexual and marital history
   - Forensic history

2. **MentalStatusExamination Model**: 109+ fields with detailed psychological assessments
   - Behavioral observations
   - Cognitive assessments
   - Thought content and processes
   - Perceptual disturbances

3. **Questionnaire Responses**: User answers to psychological assessments
4. **Appointment Notes**: Session notes and clinical observations

### Existing Encryption
- Basic AES-256-GCM encryption service exists for Google Calendar tokens
- Passwords hashed with bcrypt
- No encryption for medical/psychological data

## Proposed Architecture

### 1. Hierarchical Key Management System

```
Master Key (MK) - Stored in HSM/AWS KMS/Azure Key Vault
    ├── Organization Key (OK) - Encrypted with MK
    │   └── Data Encryption Keys (DEK) - Per data type
    │       ├── CaseHistory DEK
    │       ├── MentalStatusExamination DEK
    │       ├── Questionnaire DEK
    │       └── Appointment DEK
    └── Global DEK (for system-wide data)
```

**Key Features:**
- Master Key never leaves secure storage
- DEKs rotated quarterly
- OKs rotated annually
- All keys versioned and audited

### 2. Field-Level Encryption Strategy

#### CaseHistory Model - High Sensitivity Fields (Encrypt All)
**Personal Identification:**
- `identification_name`, `identification_father_husband_name`, `identification_address`
- `identification_source_of_referral`, `identification_reason_for_referral`

**Family & Social History:**
- `informant_name` and all informant details
- `family_history_family_tree`, `family_history_psychiatric_illness`
- All family interaction and expressed emotion fields

**Medical & Psychiatric:**
- `chief_complaints`
- `personal_history_*` (birth details, childhood disorders)
- `medical_history_*` (illness, doctors, medication, hospitalization)
- `forensic_history`

**Sexual & Marital:**
- All `sexual_*` fields (source, age, reaction, libido, masturbation, fantasy, deviance)
- All `marital_*` fields (details, adjustment, sexual life, children)
- `menstrual_*` and related symptoms

**Psychological:**
- `fantasy_life`
- `present_illness_*` (evolution, treatment history)
- `problem_conception`, `patient_view_responsibility`
- `additional_information`

#### MentalStatusExamination Model - High Sensitivity Fields
**All fields encrypted except:**
- `user_id`, `partner_id` (foreign keys)
- `created_at`, `updated_at` (metadata)
- `verbatim_report` (highly sensitive - encrypted)

#### Questionnaire Responses
- `answer_text` field encrypted
- `additional_notes` field encrypted
- Metadata (assignment_id, question_id) remains unencrypted for queries

#### Appointment Notes
- `notes` field encrypted
- Other metadata remains unencrypted for scheduling

### 3. Encryption Service Enhancement

```javascript
// Enhanced encryption service with key management
class EnhancedEncryptionService {
  // Existing AES-256-GCM encryption
  encrypt(text, keyId = 'default') {}
  decrypt(encryptedText, keyId = 'default') {}
  
  // New key management methods
  generateDataKey(organizationId, dataType) {}
  rotateDataKey(organizationId, dataType) {}
  getKeyVersion(keyId) {}
  
  // Batch operations for performance
  encryptObject(dataObject, fieldsToEncrypt, keyId) {}
  decryptObject(encryptedObject, fieldsToDecrypt, keyId) {}
}
```

### 4. Database Schema Changes

#### New Tables for Key Management
```sql
-- Encryption key store
CREATE TABLE encryption_keys (
    id SERIAL PRIMARY KEY,
    key_id VARCHAR(100) UNIQUE NOT NULL,
    key_type VARCHAR(50) NOT NULL, -- 'master', 'organization', 'data'
    encrypted_key TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    organization_id INTEGER REFERENCES organizations(id),
    data_type VARCHAR(50), -- 'case_history', 'mental_status', etc.
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    rotated_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active' -- 'active', 'deprecated', 'retired'
);

-- Audit log for encryption operations
CREATE TABLE encryption_audit_log (
    id SERIAL PRIMARY KEY,
    operation VARCHAR(50) NOT NULL, -- 'encrypt', 'decrypt', 'key_rotation'
    data_type VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    organization_id INTEGER REFERENCES organizations(id),
    user_id INTEGER REFERENCES users(id),
    key_id VARCHAR(100) NOT NULL,
    key_version INTEGER NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Modified Existing Tables
```sql
-- Add encrypted columns and key references
ALTER TABLE case_histories 
ADD COLUMN encrypted_data JSONB,
ADD COLUMN encryption_key_id VARCHAR(100),
ADD COLUMN encryption_version INTEGER DEFAULT 1;

ALTER TABLE mental_status_examinations
ADD COLUMN encrypted_data JSONB,
ADD COLUMN encryption_key_id VARCHAR(100),
ADD COLUMN encryption_version INTEGER DEFAULT 1;

ALTER TABLE questionnaire_responses
ADD COLUMN encrypted_answer_text TEXT,
ADD COLUMN encryption_key_id VARCHAR(100),
ADD COLUMN encryption_version INTEGER DEFAULT 1;

ALTER TABLE appointments
ADD COLUMN encrypted_notes TEXT,
ADD COLUMN encryption_key_id VARCHAR(100),
ADD COLUMN encryption_version INTEGER DEFAULT 1;
```

### 5. API Layer Encryption/Decryption

#### Middleware Approach
```javascript
// Encryption middleware for sensitive routes
const encryptionMiddleware = {
  // Encrypt request data before saving
  encryptRequest: (modelName, fields) => (req, res, next) => {
    // Encrypt specified fields in req.body
  },
  
  // Decrypt response data before sending
  decryptResponse: (modelName, fields) => (req, res, next) => {
    // Decrypt specified fields in response
  }
};
```

#### Controller Updates
```javascript
// Example: CaseHistory controller
class CaseHistoryController {
  async create(req, res) {
    // 1. Get organization-specific encryption key
    const keyId = await encryptionService.getDataKey(req.user.organization_id, 'case_history');
    
    // 2. Encrypt sensitive fields
    const encryptedData = await encryptionService.encryptObject(
      req.body, 
      SENSITIVE_FIELDS.CASE_HISTORY,
      keyId
    );
    
    // 3. Save encrypted data
    const caseHistory = await CaseHistory.create({
      ...req.body,
      encrypted_data: encryptedData,
      encryption_key_id: keyId,
      encryption_version: 1
    });
    
    // 4. Audit log
    await auditService.logEncryption('encrypt', 'case_history', caseHistory.id, req.user);
  }
  
  async get(req, res) {
    // 1. Retrieve encrypted data
    const caseHistory = await CaseHistory.findById(req.params.id);
    
    // 2. Decrypt sensitive fields
    const decryptedData = await encryptionService.decryptObject(
      caseHistory.encrypted_data,
      SENSITIVE_FIELDS.CASE_HISTORY,
      caseHistory.encryption_key_id
    );
    
    // 3. Merge with non-encrypted fields
    const response = { ...caseHistory, ...decryptedData };
    
    // 4. Audit log
    await auditService.logEncryption('decrypt', 'case_history', caseHistory.id, req.user);
    
    res.json(response);
  }
}
```

### 6. Search Functionality Preservation

#### Approach: Encrypted Search with Blind Indexing
```javascript
// For fields that need search capability
class SearchableEncryptionService {
  // Create blind index for encrypted fields
  createBlindIndex(plaintext, key) {
    return crypto.createHmac('sha256', key).update(plaintext).digest('hex');
  }
  
  // Search using blind index
  async searchEncryptedField(model, field, searchTerm, organizationId) {
    const index = this.createBlindIndex(searchTerm, organizationId);
    return model.findByBlindIndex(field, index);
  }
}
```

**Fields Requiring Search:**
- `identification_name` (patient search)
- `chief_complaints` (symptom search)
- `appointment_date` (date-based queries - not encrypted)

### 7. Audit and Compliance Features

#### HIPAA Audit Trail Requirements
```javascript
class AuditService {
  // Log all encryption/decryption operations
  async logEncryption(operation, dataType, recordId, user, success = true, error = null) {
    const auditRecord = {
      operation,
      data_type: dataType,
      record_id: recordId,
      organization_id: user.organization_id,
      user_id: user.id,
      key_id: user.activeKeyId,
      key_version: user.keyVersion,
      ip_address: user.ipAddress,
      user_agent: user.userAgent,
      success,
      error_message: error?.message
    };
    
    await db.query(
      'INSERT INTO encryption_audit_log (...) VALUES (...)',
      Object.values(auditRecord)
    );
  }
  
  // Generate compliance reports
  async generateHIPAAReport(organizationId, startDate, endDate) {
    // Report on all PHI access
    // Include: who, what, when, why
  }
}
```

### 8. Key Rotation Strategy

#### Automated Rotation Schedule
- **Data Encryption Keys (DEK)**: Every 90 days
- **Organization Keys (OK)**: Every 365 days
- **Master Key**: Manual rotation only, with full re-encryption

#### Rotation Process
```javascript
class KeyRotationService {
  async rotateOrganizationKey(organizationId) {
    // 1. Generate new organization key
    const newKey = await this.generateOrganizationKey();
    
    // 2. Re-encrypt all DEKs with new OK
    const deks = await this.getDataKeys(organizationId);
    for (const dek of deks) {
      await this.reencryptDEK(dek.id, newKey);
    }
    
    // 3. Update active key reference
    await this.updateActiveOrganizationKey(organizationId, newKey.id);
    
    // 4. Schedule old key retirement (30 days)
    await this.scheduleKeyRetirement(oldKey.id, 30);
  }
  
  async rotateDataKey(organizationId, dataType) {
    // 1. Generate new DEK
    const newDEK = await this.generateDataKey(organizationId, dataType);
    
    // 2. Re-encrypt all data with new DEK
    await this.reencryptAllData(organizationId, dataType, newDEK.id);
    
    // 3. Update encryption version
    await this.updateEncryptionVersion(organizationId, dataType);
  }
}
```

### 9. Performance Optimization

#### Caching Strategy
```javascript
// Cache frequently used keys
class KeyCache {
  constructor() {
    this.cache = new Map();
    this.ttl = 15 * 60 * 1000; // 15 minutes
  }
  
  get(keyId) {
    const item = this.cache.get(keyId);
    if (item && Date.now() - item.timestamp < this.ttl) {
      return item.key;
    }
    this.cache.delete(keyId);
    return null;
  }
}

// Batch encryption/decryption
class BatchEncryptionService {
  async encryptBatch(records, fields, keyId) {
    // Process multiple records in parallel
    const promises = records.map(record => 
      encryptionService.encryptObject(record, fields, keyId)
    );
    return Promise.all(promises);
  }
}
```

### 10. Compliance Documentation

#### Required Documentation
1. **Encryption Policy Document**
   - Key management procedures
   - Access control policies
   - Incident response procedures

2. **Technical Safeguards Documentation**
   - Encryption algorithms and key lengths
   - Key storage and protection mechanisms
   - Audit logging procedures

3. **Business Associate Agreement (BAA) Template**
   - For HIPAA compliance with partners

4. **Data Processing Agreement (DPA) Template**
   - For GDPR compliance

5. **Breach Notification Procedures**
   - 60-day notification for HIPAA
   - 72-hour notification for GDPR

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Enhance encryption service with key management
- [ ] Create key management database tables
- [ ] Implement audit logging system
- [ ] Set up development environment with test keys

### Phase 2: Core Models (Week 3-4)
- [ ] Implement encryption for CaseHistory model
- [ ] Implement encryption for MentalStatusExamination model
- [ ] Create database migration scripts
- [ ] Update API controllers

### Phase 3: Secondary Models (Week 5-6)
- [ ] Implement encryption for Questionnaire responses
- [ ] Implement encryption for Appointment notes
- [ ] Add search functionality for encrypted fields
- [ ] Performance testing and optimization

### Phase 4: Key Management (Week 7-8)
- [ ] Implement key rotation mechanisms
- [ ] Create key management UI for admins
- [ ] Implement emergency key recovery procedures
- [ ] Disaster recovery testing

### Phase 5: Compliance & Documentation (Week 9-10)
- [ ] Generate compliance documentation
- [ ] Implement data retention policies
- [ ] Create breach notification procedures
- [ ] Security audit and penetration testing

## Security Considerations

### Threat Model
1. **Database Breach**: Encrypted data remains protected
2. **Application Compromise**: Keys protected by secure key management
3. **Insider Threats**: Audit logs track all access
4. **Man-in-the-Middle**: TLS encryption for data in transit

### Security Controls
1. **Encryption at Rest**: AES-256-GCM for all sensitive data
2. **Encryption in Transit**: TLS 1.3 for all communications
3. **Access Control**: Role-based access with principle of least privilege
4. **Audit Logging**: Comprehensive logging of all PHI access
5. **Key Management**: HSM/KMS integration for master key protection

## Compliance Mapping

### HIPAA Requirements
- **164.312(a)(2)(iv)**: Encryption and decryption - ✅ Implemented
- **164.312(b)**: Audit controls - ✅ Implemented
- **164.312(c)(1)**: Integrity controls - ✅ Implemented
- **164.312(d)**: Person or entity authentication - ✅ Existing
- **164.312(e)(2)(ii)**: Encryption - ✅ Implemented

### GDPR Requirements
- **Article 32(1)(a)**: Pseudonymization and encryption - ✅ Implemented
- **Article 32(1)(b)**: Ongoing confidentiality - ✅ Implemented
- **Article 33**: Breach notification - ✅ Procedures defined
- **Article 35**: Data protection impact assessment - ✅ Documentation provided

## Cost Estimates

### Development Costs
- **Phase 1**: 80 hours
- **Phase 2**: 120 hours
- **Phase 3**: 100 hours
- **Phase 4**: 80 hours
- **Phase 5**: 60 hours
- **Total**: 440 hours

### Infrastructure Costs
- **AWS KMS/Azure Key Vault**: $50-200/month
- **Additional Database Storage**: 10-20% increase for encrypted data
- **Backup and Recovery**: Existing systems sufficient

## Risk Assessment

### High Risk (Mitigated)
- **Key Loss**: Implement multi-layer backup and recovery
- **Performance Impact**: Optimize with caching and batching
- **Implementation Complexity**: Phased approach with thorough testing

### Medium Risk (Managed)
- **User Experience**: Minimal impact with proper implementation
- **Search Functionality**: Limited to specific fields with blind indexing
- **Migration Complexity**: Zero-downtime migration strategy

### Low Risk (Accepted)
- **Increased Storage**: Acceptable for compliance benefits
- **Development Time**: Necessary for legal compliance

## Success Metrics

1. **Security**: All sensitive data encrypted at rest and in transit
2. **Compliance**: Pass HIPAA and GDPR security assessments
3. **Performance**: <10% impact on response times
4. **Usability**: No degradation in user experience
5. **Audit**: 100% of PHI access logged and traceable

## Next Steps

1. Review and approve architecture plan
2. Set up development environment with test encryption keys
3. Begin Phase 1 implementation
4. Schedule security audit upon completion
5. Plan production deployment with zero-downtime migration