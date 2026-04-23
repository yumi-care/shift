const express = require('express');
const path = require('path');
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ============ CORPORATIONS ============
app.get('/api/corporations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('corporations')
      .select('*')
      .order('corp_id', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/corporations', async (req, res) => {
  try {
    const { corp_name } = req.body;
    if (!corp_name) return res.status(400).json({ error: '法人名は必須です' });

    const { data, error } = await supabase
      .from('corporations')
      .insert([{ corp_name }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/corporations/:id', async (req, res) => {
  try {
    const corpId = req.params.id;
    const { data: facilities } = await supabase
      .from('facilities')
      .select('facility_id')
      .eq('corp_id', corpId);

    for (const fac of facilities) {
      await supabase.from('locations').delete().eq('facility_id', fac.facility_id);
    }
    await supabase.from('facilities').delete().eq('corp_id', corpId);
    await supabase.from('corporations').delete().eq('corp_id', corpId);

    res.json({ message: '削除完了' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ FACILITIES ============
app.get('/api/corporations/:corpId/facilities', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('facilities')
      .select('*')
      .eq('corp_id', req.params.corpId)
      .order('facility_id', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/corporations/:corpId/facilities', async (req, res) => {
  try {
    const { facility_name } = req.body;
    if (!facility_name) return res.status(400).json({ error: '事業所名は必須です' });

    const { data, error } = await supabase
      .from('facilities')
      .insert([{ corp_id: req.params.corpId, facility_name }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/facilities/:id', async (req, res) => {
  try {
    await supabase.from('locations').delete().eq('facility_id', req.params.id);
    await supabase.from('facilities').delete().eq('facility_id', req.params.id);
    res.json({ message: '削除完了' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ LOCATIONS ============
app.get('/api/facilities/:facilityId/locations', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('facility_id', req.params.facilityId)
      .order('location_id', { ascending: true });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/facilities/:facilityId/locations', async (req, res) => {
  try {
    const { location_name } = req.body;
    if (!location_name) return res.status(400).json({ error: '拠点名は必須です' });

    const { data, error } = await supabase
      .from('locations')
      .insert([{ facility_id: req.params.facilityId, location_name }])
      .select();
    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/locations/:id', async (req, res) => {
  try {
    await supabase.from('locations').delete().eq('location_id', req.params.id);
    res.json({ message: '削除完了' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ STATIC FILES ============
app.use(express.static(path.join(__dirname, 'frontend/dist')));
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/dist/index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
