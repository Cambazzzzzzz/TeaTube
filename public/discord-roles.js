// DemlikChat - Rol Sistemi
// Tam Discord benzeri rol yönetimi

// ==================== ROL YÖNETİMİ ====================

let serverRoles = [];
let currentEditingRole = null;

async function loadServerRoles(serverId) {
  try {
    const res = await fetch(`${API_URL}/api/dc/roles/${serverId}`);
    const data = await res.json();
    
    if (data.success) {
      serverRoles = data.roles;
      return serverRoles;
    }
  } catch (err) {
    console.error('Load roles error:', err);
  }
  return [];
}

function showRolesModal(serverId) {
  loadServerRoles(serverId).then(roles => {
    const modal = document.getElementById('modal');
    modal.innerHTML = `
      <div style="padding:24px;max-height:80vh;overflow-y:auto;width:600px;">
        <h2 style="font-size:24px;font-weight:600;margin-bottom:24px;color:var(--header-primary);">Sunucu Rolleri</h2>
        
        <!-- Rol Oluştur -->
        <button onclick="showCreateRoleModal(${serverId})" style="width:100%;padding:12px;background:var(--brand);border:none;border-radius:4px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;margin-bottom:24px;">
          <i class="fas fa-plus"></i> Yeni Rol Oluştur
        </button>
        
        <!-- Roller Listesi -->
        <div id="roles-list">
          ${roles.length === 0 ? '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">Henüz rol yok</p>' : ''}
        </div>
        
        <div style="margin-top:24px;">
          <button onclick="closeModal()" style="width:100%;padding:12px;background:transparent;border:none;border-radius:4px;color:var(--text-normal);font-size:14px;font-weight:600;cursor:pointer;">Kapat</button>
        </div>
      </div>
    `;
    
    // Render roles
    if (roles.length > 0) {
      const rolesList = document.getElementById('roles-list');
      roles.forEach(role => {
        const roleEl = document.createElement('div');
        roleEl.style.cssText = 'display:flex;align-items:center;gap:12px;padding:16px;background:var(--bg-secondary);border-radius:8px;margin-bottom:12px;border-left:4px solid ' + (role.color || '#99aab5') + ';';
        roleEl.innerHTML = `
          <div style="flex:1;">
            <div style="font-weight:600;color:${role.color || 'var(--header-primary)'};font-size:16px;margin-bottom:4px;">${role.name}</div>
            <div style="font-size:12px;color:var(--text-muted);">${role.member_count || 0} üye</div>
          </div>
          <button onclick="editRole(${serverId}, ${role.id})" style="padding:8px 16px;background:var(--bg-tertiary);border:none;border-radius:4px;color:var(--text-normal);font-size:12px;font-weight:600;cursor:pointer;">
            <i class="fas fa-edit"></i> Düzenle
          </button>
          ${role.is_default ? '' : `
            <button onclick="deleteRole(${serverId}, ${role.id})" style="padding:8px 16px;background:var(--red);border:none;border-radius:4px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">
              <i class="fas fa-trash"></i> Sil
            </button>
          `}
        `;
        rolesList.appendChild(roleEl);
      });
    }
    
    document.getElementById('modal-overlay').classList.add('active');
  });
}

function showCreateRoleModal(serverId) {
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div style="padding:24px;max-height:80vh;overflow-y:auto;width:500px;">
      <h2 style="font-size:24px;font-weight:600;margin-bottom:24px;color:var(--header-primary);">Yeni Rol Oluştur</h2>
      
      <!-- Rol Adı -->
      <div class="form-group" style="margin-bottom:20px;">
        <label style="display:block;font-size:12px;font-weight:600;color:var(--header-secondary);text-transform:uppercase;margin-bottom:8px;">ROL ADI</label>
        <input type="text" id="role-name-input" placeholder="Yeni Rol" style="width:100%;padding:10px;background:var(--bg-tertiary);border:1px solid rgba(0,0,0,0.3);border-radius:4px;color:var(--text-normal);font-size:16px;">
      </div>
      
      <!-- Rol Rengi -->
      <div class="form-group" style="margin-bottom:20px;">
        <label style="display:block;font-size:12px;font-weight:600;color:var(--header-secondary);text-transform:uppercase;margin-bottom:8px;">ROL RENGİ</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${['#99aab5', '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e91e63', '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6'].map(color => `
            <button onclick="selectRoleColor('${color}')" style="width:40px;height:40px;background:${color};border:2px solid transparent;border-radius:50%;cursor:pointer;transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'"></button>
          `).join('')}
        </div>
        <input type="color" id="role-color-input" value="#99aab5" style="width:100%;height:40px;margin-top:12px;border:none;border-radius:4px;cursor:pointer;">
      </div>
      
      <!-- İzinler -->
      <div class="form-group" style="margin-bottom:20px;">
        <label style="display:block;font-size:12px;font-weight:600;color:var(--header-secondary);text-transform:uppercase;margin-bottom:12px;">İZİNLER</label>
        
        <div style="background:var(--bg-secondary);border-radius:8px;padding:16px;">
          <label style="display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer;">
            <input type="checkbox" id="perm-admin" style="width:20px;height:20px;cursor:pointer;">
            <div>
              <div style="font-weight:600;color:var(--header-primary);">Yönetici</div>
              <div style="font-size:12px;color:var(--text-muted);">Tüm izinlere sahip olur</div>
            </div>
          </label>
          
          <label style="display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer;">
            <input type="checkbox" id="perm-manage-server" style="width:20px;height:20px;cursor:pointer;">
            <div>
              <div style="font-weight:600;color:var(--header-primary);">Sunucuyu Yönet</div>
              <div style="font-size:12px;color:var(--text-muted);">Sunucu ayarlarını değiştirebilir</div>
            </div>
          </label>
          
          <label style="display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer;">
            <input type="checkbox" id="perm-manage-roles" style="width:20px;height:20px;cursor:pointer;">
            <div>
              <div style="font-weight:600;color:var(--header-primary);">Rolleri Yönet</div>
              <div style="font-size:12px;color:var(--text-muted);">Rolleri oluşturabilir ve düzenleyebilir</div>
            </div>
          </label>
          
          <label style="display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer;">
            <input type="checkbox" id="perm-manage-channels" style="width:20px;height:20px;cursor:pointer;">
            <div>
              <div style="font-weight:600;color:var(--header-primary);">Kanalları Yönet</div>
              <div style="font-size:12px;color:var(--text-muted);">Kanal oluşturabilir ve düzenleyebilir</div>
            </div>
          </label>
          
          <label style="display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer;">
            <input type="checkbox" id="perm-kick-members" style="width:20px;height:20px;cursor:pointer;">
            <div>
              <div style="font-weight:600;color:var(--header-primary);">Üyeleri At</div>
              <div style="font-size:12px;color:var(--text-muted);">Üyeleri sunucudan atabilir</div>
            </div>
          </label>
          
          <label style="display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer;">
            <input type="checkbox" id="perm-ban-members" style="width:20px;height:20px;cursor:pointer;">
            <div>
              <div style="font-weight:600;color:var(--header-primary);">Üyeleri Yasakla</div>
              <div style="font-size:12px;color:var(--text-muted);">Üyeleri sunucudan yasaklayabilir</div>
            </div>
          </label>
          
          <label style="display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer;">
            <input type="checkbox" id="perm-manage-messages" style="width:20px;height:20px;cursor:pointer;">
            <div>
              <div style="font-weight:600;color:var(--header-primary);">Mesajları Yönet</div>
              <div style="font-size:12px;color:var(--text-muted);">Başkalarının mesajlarını silebilir</div>
            </div>
          </label>
          
          <label style="display:flex;align-items:center;gap:12px;padding:8px 0;cursor:pointer;">
            <input type="checkbox" id="perm-mention-everyone" style="width:20px;height:20px;cursor:pointer;">
            <div>
              <div style="font-weight:600;color:var(--header-primary);">@everyone Kullan</div>
              <div style="font-size:12px;color:var(--text-muted);">Herkesi etiketleyebilir</div>
            </div>
          </label>
        </div>
      </div>
      
      <div style="display:flex;gap:12px;margin-top:24px;">
        <button onclick="showRolesModal(${serverId})" style="flex:1;padding:12px;background:transparent;border:none;border-radius:4px;color:var(--text-normal);font-size:14px;font-weight:600;cursor:pointer;">İptal</button>
        <button onclick="createRole(${serverId})" style="flex:1;padding:12px;background:var(--brand);border:none;border-radius:4px;color:#fff;font-size:14px;font-weight:600;cursor:pointer;">Oluştur</button>
      </div>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('active');
}

function selectRoleColor(color) {
  document.getElementById('role-color-input').value = color;
}

async function createRole(serverId) {
  const name = document.getElementById('role-name-input').value.trim();
  const color = document.getElementById('role-color-input').value;
  
  if (!name) {
    showToast('Rol adı gerekli', 'error');
    return;
  }
  
  const permissions = {
    administrator: document.getElementById('perm-admin').checked,
    manage_server: document.getElementById('perm-manage-server').checked,
    manage_roles: document.getElementById('perm-manage-roles').checked,
    manage_channels: document.getElementById('perm-manage-channels').checked,
    kick_members: document.getElementById('perm-kick-members').checked,
    ban_members: document.getElementById('perm-ban-members').checked,
    manage_messages: document.getElementById('perm-manage-messages').checked,
    mention_everyone: document.getElementById('perm-mention-everyone').checked
  };
  
  try {
    const res = await fetch(`${API_URL}/api/dc/roles/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, name, color, permissions })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Rol oluşturuldu!', 'success');
      showRolesModal(serverId);
    } else {
      showToast(data.error || 'Rol oluşturulamadı', 'error');
    }
  } catch (err) {
    console.error('Create role error:', err);
    showToast('Bağlantı hatası', 'error');
  }
}

async function editRole(serverId, roleId) {
  // Rol düzenleme modal'ı - createRole'a benzer ama mevcut değerlerle dolu
  showToast('Rol düzenleme özelliği yakında!', 'info');
}

async function deleteRole(serverId, roleId) {
  if (!confirm('Bu rolü silmek istediğinden emin misin?')) return;
  
  try {
    const res = await fetch(`${API_URL}/api/dc/roles/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, roleId })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast('Rol silindi', 'success');
      showRolesModal(serverId);
    } else {
      showToast(data.error || 'Rol silinemedi', 'error');
    }
  } catch (err) {
    console.error('Delete role error:', err);
    showToast('Bağlantı hatası', 'error');
  }
}

// ==================== ÜYE ROL YÖNETİMİ ====================

async function showMemberRolesModal(serverId, userId, username) {
  const roles = await loadServerRoles(serverId);
  
  // Üyenin mevcut rollerini al
  const res = await fetch(`${API_URL}/api/dc/member-roles/${serverId}/${userId}`);
  const data = await res.json();
  const memberRoles = data.success ? data.roles : [];
  
  const modal = document.getElementById('modal');
  modal.innerHTML = `
    <div style="padding:24px;max-height:80vh;overflow-y:auto;width:500px;">
      <h2 style="font-size:24px;font-weight:600;margin-bottom:8px;color:var(--header-primary);">${username} - Roller</h2>
      <p style="font-size:14px;color:var(--text-muted);margin-bottom:24px;">Bu üyenin rollerini yönet</p>
      
      <div id="member-roles-list">
        ${roles.filter(r => !r.is_default).map(role => {
          const hasRole = memberRoles.some(mr => mr.role_id === role.id);
          return `
            <label style="display:flex;align-items:center;gap:12px;padding:12px;background:var(--bg-secondary);border-radius:8px;margin-bottom:8px;cursor:pointer;border-left:4px solid ${role.color || '#99aab5'};">
              <input type="checkbox" ${hasRole ? 'checked' : ''} onchange="toggleMemberRole(${serverId}, ${userId}, ${role.id}, this.checked)" style="width:20px;height:20px;cursor:pointer;">
              <div style="flex:1;">
                <div style="font-weight:600;color:${role.color || 'var(--header-primary)'};">${role.name}</div>
              </div>
            </label>
          `;
        }).join('')}
      </div>
      
      <div style="margin-top:24px;">
        <button onclick="closeModal()" style="width:100%;padding:12px;background:transparent;border:none;border-radius:4px;color:var(--text-normal);font-size:14px;font-weight:600;cursor:pointer;">Kapat</button>
      </div>
    </div>
  `;
  document.getElementById('modal-overlay').classList.add('active');
}

async function toggleMemberRole(serverId, userId, roleId, add) {
  try {
    const res = await fetch(`${API_URL}/api/dc/member-roles/${add ? 'add' : 'remove'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serverId, userId, roleId })
    });
    
    const data = await res.json();
    
    if (data.success) {
      showToast(add ? 'Rol eklendi' : 'Rol kaldırıldı', 'success');
    } else {
      showToast(data.error || 'İşlem başarısız', 'error');
    }
  } catch (err) {
    console.error('Toggle member role error:', err);
    showToast('Bağlantı hatası', 'error');
  }
}
