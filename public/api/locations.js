const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const pathParts = req.url.split('/').filter(p => p);

    // GET /api/facilities/[facilityId]/locations
    if (req.method === 'GET') {
      const facilityId = pathParts[2]; // /api/facilities/1/locations

      if (!facilityId) {
        return res.status(400).json({ error: 'facility_id は必須です' });
      }

      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .eq('facility_id', facilityId)
        .order('location_id', { ascending: true });

      if (error) throw error;
      return res.status(200).json(data);
    }

    // POST /api/facilities/[facilityId]/locations
    if (req.method === 'POST') {
      const facilityId = pathParts[2];
      const { location_name } = req.body;

      if (!location_name) {
        return res.status(400).json({ error: '拠点名は必須です' });
      }

      const { data, error } = await supabase
        .from('locations')
        .insert([
          {
            facility_id: parseInt(facilityId),
            location_name
          }
        ])
        .select();

      if (error) throw error;
      return res.status(201).json(data[0]);
    }

    // DELETE /api/locations/[id]
    if (req.method === 'DELETE') {
      const locationId = pathParts[pathParts.length - 1];

      if (!locationId || isNaN(locationId)) {
        return res.status(400).json({ error: 'location_id は必須です' });
      }

      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('location_id', parseInt(locationId));

      if (error) throw error;
      return res.status(200).json({ message: '削除完了' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
