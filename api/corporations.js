const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  // CORS ヘッダー
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    if (req.method === 'GET') {
      // 法人一覧取得
      const { data, error } = await supabase
        .from('corporations')
        .select('*')
        .order('corp_id', { ascending: true });

      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      // 法人作成
      const { corp_name, corp_number } = req.body;

      if (!corp_name) {
        return res.status(400).json({ error: '法人名は必須です' });
      }

      const { data, error } = await supabase
        .from('corporations')
        .insert([
          {
            corp_name,
            corp_number: corp_number || `corp_${Date.now()}`
          }
        ])
        .select();

      if (error) throw error;
      return res.status(201).json(data[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
