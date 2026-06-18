import { supabase } from './supabase'

// Anonymous, persistent-per-browser session id (no PII).
function sessionId() {
  try {
    let s = localStorage.getItem('kdo_sid')
    if (!s) {
      s = (crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(16).slice(2))
      localStorage.setItem('kdo_sid', s)
    }
    return s
  } catch {
    return null
  }
}

/**
 * Append a product event. COPPA: never pass child names or any PII in `props`.
 *  track('item_added', { family_id, role: 'parent', props: { category: 'cards' } })
 */
export async function track(name, { family_id = null, role = null, props = null } = {}) {
  try {
    await supabase.from('events').insert({
      name,
      family_id,
      role,
      props,
      session_id: sessionId(),
    })
  } catch {
    // telemetry must never break the UI
  }
}
