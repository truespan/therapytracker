const fs = require('fs');
const path = require('path');

// Function to fix Chevron icons in a file
function fixChevronIcons(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace all instances of ChevronUp /> with ChevronUp className="dark:text-white" />
    content = content.replace(/<ChevronUp \/>/g, '<ChevronUp className="dark:text-white" />');
    
    // Replace all instances of ChevronDown /> with ChevronDown className="dark:text-white" />
    content = content.replace(/<ChevronDown \/>/g, '<ChevronDown className="dark:text-white" />');
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed Chevron icons in: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message);
    return false;
  }
}

// Fix both files
const filesToFix = [
  'frontend/src/components/casehistory/CaseHistoryForm.jsx',
  'frontend/src/components/mentalstatus/MentalStatusExaminationForm.jsx'
];

console.log('🔧 Fixing dark mode Chevron icons...\n');

let successCount = 0;
filesToFix.forEach(filePath => {
  if (fixChevronIcons(filePath)) {
    successCount++;
  }
});

console.log(`\n📊 Fixed ${successCount}/${filesToFix.length} files`);

if (successCount === filesToFix.length) {
  console.log('✨ All Chevron icons have been updated with dark mode support!');
} else {
  console.log('⚠️  Some files could not be updated. Please check the errors above.');
}