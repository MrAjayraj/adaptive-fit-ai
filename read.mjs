import dotenv from 'dotenv';
dotenv.config();

const url = `${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_PUBLISHABLE_KEY}`;
const res = await fetch(url);
const data = await res.json();
console.log('Tables:', Object.keys(data.definitions || {}));
