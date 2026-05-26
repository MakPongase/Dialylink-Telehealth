const fs = require('fs');
const path = require('path');
const routesDir = path.join(__dirname, 'routes');
const files = ['patient.js', 'doctor.js', 'admin.js', 'appointments.js'];

files.forEach(file => {
  const filePath = path.join(routesDir, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes('sendNotification')) {
    content = 'const { sendNotification } = require("../utils/notify");\n' + content;
  }
  
  // Custom regex replacements for each file
  // patients.js already done mostly, let's fix bp_alert
  content = content.replace(
    /await pool\.query\(\s*`INSERT INTO notifications \(user_id, type, message\)\s*VALUES \(\$1, 'bp_alert', \$2\)`,\s*\[(.*?)\]\s*\);/g,
    'await sendNotification($1); // Manually fix params next line'
  );

  fs.writeFileSync(filePath, content);
});
