/* =========================================================
   CONFIGURAÇÃO DO SUPABASE (DIRETO NO FRONTEND)
   ========================================================= */
const { SUPABASE_URL, SUPABASE_KEY } = window.ENV;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  alert("Erro: As configurações do Supabase não foram encontradas no config.js");
}

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/* =========================================================
   MÓDULOS DE API (Usando o SDK do Supabase)
   ========================================================= */
const Times = {
  listar: async () => {
    const { data, error } = await _supabase.from('times').select('*').order('nome');
    if (error) { console.error(error); alert('Erro ao buscar times.'); return []; }
    return data;
  },
  criar: async (nome) => {
    const { data, error } = await _supabase.from('times').insert([{ nome }]).select();
    if (error) { console.error(error); alert('Erro ao salvar time.'); throw error; }
    return data[0];
  }
};

const Jogadores = {
  listar: async () => {
    const { data, error } = await _supabase.from('jogadores').select('*');
    if (error) { console.error(error); alert('Erro ao buscar jogadores.'); return []; }
    return data;
  },
  criar: async (payload) => {
    const { data, error } = await _supabase.from('jogadores').insert([payload]).select();
    if (error) { console.error(error); alert('Erro ao salvar jogador.'); throw error; }
    return data[0];
  },
  atualizar: async (id, payload) => {
    const { data, error } = await _supabase.from('jogadores').update(payload).eq('id', id).select();
    if (error) { console.error(error); alert('Erro ao atualizar jogador.'); throw error; }
    return data[0];
  },
  excluir: async (id) => {
    const { error } = await _supabase.from('jogadores').delete().eq('id', id);
    if (error) { console.error(error); alert('Erro ao excluir jogador.'); throw error; }
  }
};

// Expõe globalmente para o HTML
window.Times = Times;
window.Jogadores = Jogadores;