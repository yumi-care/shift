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

    // GET /api/corporations/[corpId]/facilities
    if (req.method === 'GET') {
      const corpId = pathParts[2]; // /api/corporations/2/facilities

      if (!corpId) {
        return res.status(400).json({ error: 'corp_id は必須です' });
      }

      const { data, error } = await supabase
        .from('facilities')
        .select('*')
        .eq('corp_id', corpId)
        .order('facility_id', { ascending: true });

      if (error) throw error;
      return res.status(200).json(data);
    }

    // POST /api/corporations/[corpId]/facilities
    if (req.method === 'POST') {
      const corpId = pathParts[2];
      const { facility_name } = req.body;

      if (!facility_name) {
        return res.status(400).json({ error: '事業所名は必須です' });
      }

      const { data, error } = await supabase
        .from('facilities')
        .insert([
          {
            corp_id: parseInt(corpId),
            facility_name
          }
        ])
        .select();

      if (error) throw error;
      return res.status(201).json(data[0]);
    }

    // DELETE /api/facilities/[id]
    if (req.method === 'DELETE') {
      const facilityId = pathParts[pathParts.length - 1];

      if (!facilityId || isNaN(facilityId)) {
        return res.status(400).json({ error: 'facility_id は必須です' });
      }

      // 関連する locations を先に削除
      const { error: locError } = await supabase
        .from('locations')
        .delete()
        .eq('facility_id', parseInt(facilityId));

      if (locError) throw locError;

      // facility を削除
      const { error } = await supabase
        .from('facilities')
        .delete()
        .eq('facility_id', parseInt(facilityId));

      if (error) throw error;
      return res.status(200).json({ message: '削除完了' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
