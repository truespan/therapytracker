# WhatsApp Template Parameter Order

## Booking Template Parameters

Your WhatsApp template expects **5 parameters** in this exact order:

### Parameter Order:
1. **{{1}}** = User Name (e.g., "Chayalakshmi K N")
2. **{{2}}** = Therapist Name (e.g., "Sanjeeb K S")
3. **{{3}}** = Appointment Type (e.g., "Therapy Session - Online")
4. **{{4}}** = Date (e.g., "Sunday, 4 January 2026")
5. **{{5}}** = Time (e.g., "10:00 am")

### Example Template Content:
```
🎉 Appointment Confirmed!

Hi {{1}},

Your therapy session has been booked:

👨‍⚕️ Therapist: {{2}}
🏥 Type: {{3}}
📅 Date: {{4}}
🕐 Time: {{5}}

See you then!
```

## Code Implementation

The `prepareAppointmentConfirmationTemplateParams` function now returns parameters in this order:

```javascript
const baseParams = [
  String(userName || 'there').trim(),                    // {{1}} - User Name
  String(therapistName || 'Your therapist').trim(),      // {{2}} - Therapist Name
  String(appointmentType || 'Therapy Session').trim(),    // {{3}} - Appointment Type
  String(displayDate || appointmentDate || 'Date TBD').trim(),  // {{4}} - Date
  String(displayTime || appointmentTime || 'Time TBD').trim()   // {{5}} - Time
];
```

## Important Notes

### ✅ What's Included:
- User Name
- Therapist Name
- Appointment Type
- Date (formatted)
- Time (formatted)

### ❌ What's NOT Included:
- **Duration** - Removed (template only has 5 parameters)
- **Payment Status** - Not included in booking template

### If You Need Payment Status:
If you want to include payment status, you'll need to:
1. Create a **new template** in WhatsApp Manager with **6 parameters**
2. Add payment status as the 6th parameter
3. Set `WHATSAPP_TEMPLATE_INCLUDE_PAYMENT_STATUS=true` in environment variables

## Verification

After deploying, check logs for:

```
[WhatsApp Template] Final validated parameters:
  count: 5
  params: [
    "{{1}} = \"Chayalakshmi K N\" (length: 16)",
    "{{2}} = \"Sanjeeb K S\" (length: 11)",
    "{{3}} = \"Therapy Session - Online\" (length: 25)",
    "{{4}} = \"Sunday, 4 January 2026\" (length: 23)",
    "{{5}} = \"10:00 am\" (length: 8)"
  ]
  order: "{{1}} User Name, {{2}} Therapist Name, {{3}} Appointment Type, {{4}} Date, {{5}} Time"
```

## Expected Results

✅ **Parameter Count:** 5 (matches template)
✅ **Parameter Order:** User Name, Therapist Name, Appointment Type, Date, Time
✅ **No Empty Parameters:** All have fallback values
✅ **No Invalid Values:** All validated before sending

This should resolve the Error 1022 rejection issue!

