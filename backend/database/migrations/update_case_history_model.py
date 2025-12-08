#!/usr/bin/env python3
"""
Script to update Case History model by:
1. Removing family_history_consanguinity_present and family_history_consanguinity_absent
2. Adding family_history_consanguinity
3. Decrementing all parameter numbers after position 47
"""

import re

# Read the file
with open('../../src/models/CaseHistory.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Replace the two consanguinity fields with one in the destructuring
content = content.replace(
    '      family_history_expressed_emotion_reinforcement,\n      family_history_consanguinity_present,\n      family_history_consanguinity_absent,\n      family_history_economic_social_status,',
    '      family_history_expressed_emotion_reinforcement,\n      family_history_consanguinity,\n      family_history_economic_social_status,'
)

# Step 2: Replace in UPDATE query
content = content.replace(
    '          family_history_expressed_emotion_reinforcement = COALESCE($46, family_history_expressed_emotion_reinforcement),\n          family_history_consanguinity_present = COALESCE($47, family_history_consanguinity_present),\n          family_history_consanguinity_absent = COALESCE($48, family_history_consanguinity_absent),\n          family_history_economic_social_status = COALESCE($49, family_history_economic_social_status),',
    '          family_history_expressed_emotion_reinforcement = COALESCE($46, family_history_expressed_emotion_reinforcement),\n          family_history_consanguinity = COALESCE($47, family_history_consanguinity),\n          family_history_economic_social_status = COALESCE($48, family_history_economic_social_status),'
)

# Step 3: Replace in values array (UPDATE)
content = content.replace(
    '        family_history_expressed_emotion_critical_comments, family_history_expressed_emotion_emotional_over_involvement,\n        family_history_expressed_emotion_reinforcement, family_history_consanguinity_present, family_history_consanguinity_absent,\n        family_history_economic_social_status, family_history_home_atmosphere, family_history_sibling_rivalry,',
    '        family_history_expressed_emotion_critical_comments, family_history_expressed_emotion_emotional_over_involvement,\n        family_history_expressed_emotion_reinforcement, family_history_consanguinity,\n        family_history_economic_social_status, family_history_home_atmosphere, family_history_sibling_rivalry,'
)

# Step 4: Replace in INSERT query
content = content.replace(
    '          family_history_expressed_emotion_critical_comments, family_history_expressed_emotion_emotional_over_involvement,\n          family_history_expressed_emotion_reinforcement, family_history_consanguinity_present, family_history_consanguinity_absent,\n          family_history_economic_social_status, family_history_home_atmosphere, family_history_sibling_rivalry,',
    '          family_history_expressed_emotion_critical_comments, family_history_expressed_emotion_emotional_over_involvement,\n          family_history_expressed_emotion_reinforcement, family_history_consanguinity,\n          family_history_economic_social_status, family_history_home_atmosphere, family_history_sibling_rivalry,'
)

# Step 5: Replace in values array (INSERT)
content = content.replace(
    '        family_history_expressed_emotion_critical_comments, family_history_expressed_emotion_emotional_over_involvement,\n        family_history_expressed_emotion_reinforcement, family_history_consanguinity_present, family_history_consanguinity_absent,',
    '        family_history_expressed_emotion_critical_comments, family_history_expressed_emotion_emotional_over_involvement,\n        family_history_expressed_emotion_reinforcement, family_history_consanguinity,'
)

# Step 6: Decrement parameter numbers from $49 onwards (except $147 and $148 which are WHERE clause params)
# We need to decrement from $49 to $146
for i in range(146, 48, -1):  # Count backwards to avoid double replacement
    content = content.replace(f'${i}', f'${i-1}')

# Write back
with open('../../src/models/CaseHistory.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Model updated successfully!")
