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
      const { corp_name } = req.body;

      if (!corp_name) {
        return res.status(400).json({ error: '法人名は必須です' });
      }

      const { data, error } = await supabase
        .from('corporations')
        .insert([{ corp_name }])
        .select();

      if (error) throw error;
      return res.status(201).json(data[0]);
    }

    if (req.method === 'DELETE') {
      // 法人削除（パターン: DELETE /api/corporations/2）
      const pathParts = req.url.split('/');
      const corpId = pathParts[pathParts.length - 1];

      if (!corpId || isNaN(corpId)) {
        return res.status(400).json({ error: 'corp_id は必須です' });
      }

      // 関連する facilities を取得
      const { data: facilities, error: getFacError } = await supabase
        .from('facilities')
        .select('facility_id')
        .eq('corp_id', parseInt(corpId));

      if (getFacError) throw getFacError;

      // 各 facility に関連する locations を削除
      for (const fac of facilities) {
        await supabase
          .from('locations')
          .delete()
          .eq('facility_id', fac.facility_id);
      }

      // facilities を削除
      await supabase
        .from('facilities')
        .delete()
        .eq('corp_id', parseInt(corpId));

      // corporation を削除
      const { error } = await supabase
        .from('corporations')
        .delete()
        .eq('corp_id', parseInt(corpId));

      if (error) throw error;
      return res.status(200).json({ message: '削除完了' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
};
