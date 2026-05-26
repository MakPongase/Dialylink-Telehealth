const bcrypt = require('bcryptjs');
const pool = require('./pool');

const DOCTORS = [
  { name: 'Alice Santos', email: 'alice.santos@clinic.com', spec: 'Nephrology', city: 'Manila', province: 'Metro Manila', hospital: 'PGH', address: '123 Taft Ave, Manila, Metro Manila' },
  { name: 'Bob Reyes', email: 'bob.reyes@clinic.com', spec: 'Internal Medicine', city: 'Quezon City', province: 'Metro Manila', hospital: 'St. Lukes', address: '456 E Rodriguez, Quezon City, Metro Manila' },
  { name: 'Charlie Cruz', email: 'charlie.cruz@clinic.com', spec: 'General Practice', city: 'Makati', province: 'Metro Manila', hospital: 'Makati Med', address: '789 Ayala Ave, Makati, Metro Manila' },
  { name: 'Diana Garcia', email: 'diana.garcia@clinic.com', spec: 'Nephrology', city: 'Cebu City', province: 'Cebu', hospital: 'Chong Hua', address: '12 Osmena Blvd, Cebu City, Cebu' },
  { name: 'Evan Mendoza', email: 'evan.mendoza@clinic.com', spec: 'Internal Medicine', city: 'Davao City', province: 'Davao del Sur', hospital: 'Davao Doctors', address: '34 Quirino Ave, Davao City' },
  { name: 'Fiona Tan', email: 'fiona.tan@clinic.com', spec: 'Nephrology', city: 'Baguio City', province: 'Benguet', hospital: 'Baguio Gen', address: '56 Session Rd, Baguio City' },
  { name: 'George Lim', email: 'george.lim@clinic.com', spec: 'Cardiology', city: 'Iloilo City', province: 'Iloilo', hospital: 'Iloilo Mission', address: '78 Jaro, Iloilo City' },
  { name: 'Hannah Bautista', email: 'hannah.bautista@clinic.com', spec: 'Nephrology', city: 'Zamboanga City', province: 'Zamboanga del Sur', hospital: 'Ciudad Medical', address: '90 Nunez, Zamboanga City' },
  { name: 'Ian Ocampo', email: 'ian.ocampo@clinic.com', spec: 'Endocrinology', city: 'Cagayan de Oro', province: 'Misamis Oriental', hospital: 'Northern Mindanao Med', address: '111 CM Recto, CDO' },
  { name: 'Jane Roxas', email: 'jane.roxas@clinic.com', spec: 'General Practice', city: 'Pasig City', province: 'Metro Manila', hospital: 'Medical City', address: '222 Ortigas Ave, Pasig City' }
];

async function generateConnectionCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function seedDoctors() {
  try {
    console.log('Seeding doctors...');
    const passwordHash = await bcrypt.hash('password123', 10);
    
    for (let i = 0; i < DOCTORS.length; i++) {
      const doc = DOCTORS[i];
      const code = await generateConnectionCode();
      const phone = '0917' + String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      const license = '1' + String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
      const years = Math.floor(Math.random() * 20) + 1;
      
      const userRes = await pool.query(
        `INSERT INTO users (email, password_hash, role, full_name, phone, is_verified) 
         VALUES ($1, $2, $3, $4, $5, $6) 
         ON CONFLICT (email) DO NOTHING RETURNING id`,
        [doc.email, passwordHash, 'doctor', 'Dr. ' + doc.name, phone, true]
      );
      
      let userId;
      if (userRes.rowCount === 0) {
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [doc.email]);
        userId = existing.rows[0].id;
        console.log(`User ${doc.email} already exists.`);
      } else {
        userId = userRes.rows[0].id;
      }
      
      const profileCheck = await pool.query('SELECT id FROM doctor_profiles WHERE user_id = $1', [userId]);
      if (profileCheck.rowCount === 0) {
        await pool.query(
          `INSERT INTO doctor_profiles 
           (user_id, license_number, specialization, connection_code, is_approved, status, hospital_affiliation, years_experience, address, practice_city, practice_province, bio, is_listed, accepting_patients) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, true)`,
          [
            userId, license, doc.spec, code, true, 'approved', doc.hospital, years, doc.address, doc.city, doc.province, 
            `Experienced ${doc.spec} serving ${doc.city}.`
          ]
        );
        console.log(`Seeded Dr. ${doc.name}`);
      } else {
        await pool.query(
          `UPDATE doctor_profiles 
           SET is_listed = true, accepting_patients = true 
           WHERE user_id = $1`,
          [userId]
        );
        console.log(`Updated Dr. ${doc.name} to be listed and accepting patients.`);
      }
    }
    
    console.log('Seeding complete. Password for all doctors is: password123');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

seedDoctors();
