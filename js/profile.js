console.log('=== Profile Script Loading ===');

let isEditMode = false;
let pendingPostImage = null;

let profileData = {
  name: '',
  bio: '',
  tags: [],
  contact: { email: '', phone: '', location: '' },
  stats: { connections: 0, litters: 0, rating: 0 },
  profileImg: '../html/assets/animals/doge.png',
  coverImg: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200'
};

let posts = [];
let animals = [];

let mockContacts = [];
let mockMessages = {};
let currentChatId = null;

let currentPostId = null;
let currentAnimalId = null;
let currentComment = null;

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    setTimeout(() => {
      if (!modal.classList.contains('active')) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
      }
    }, 300);
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    if (m === '"') return '&quot;';
    if (m === "'") return '&#039;';
    return m;
  });
}

function previewImage(input, previewId) {
  const file = input.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const preview = document.getElementById(previewId);
      if (preview) {
        preview.style.backgroundImage = `url('${e.target.result}')`;
        preview.classList.add('has-image');
        preview.innerHTML = '';
      }
    };
    reader.readAsDataURL(file);
  }
}

function previewPostImage(input, previewContainerId) {
  const container = document.getElementById(previewContainerId);
  if (!container) return;
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  if (file.size > 5 * 1024 * 1024) {
    showToast('Image too large! Max 5MB', 'error');
    input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.width = '100%';
    wrapper.style.marginTop = '12px';
    const img = document.createElement('img');
    img.src = e.target.result;
    img.style.width = '100%';
    img.style.height = 'auto';
    img.style.maxHeight = '250px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '12px';
    img.style.border = '1px solid var(--border-light)';
    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '×';
    removeBtn.style.position = 'absolute';
    removeBtn.style.top = '8px';
    removeBtn.style.right = '8px';
    removeBtn.style.width = '30px';
    removeBtn.style.height = '30px';
    removeBtn.style.borderRadius = '50%';
    removeBtn.style.background = 'rgba(0,0,0,0.6)';
    removeBtn.style.color = 'white';
    removeBtn.style.border = 'none';
    removeBtn.style.cursor = 'pointer';
    removeBtn.style.fontSize = '20px';
    removeBtn.style.display = 'flex';
    removeBtn.style.alignItems = 'center';
    removeBtn.style.justifyContent = 'center';
    removeBtn.style.transition = 'all 0.2s';
    removeBtn.onmouseover = function() { this.style.background = 'rgba(255,0,0,0.8)'; this.style.transform = 'scale(1.1)'; };
    removeBtn.onmouseout = function() { this.style.background = 'rgba(0,0,0,0.6)'; this.style.transform = 'scale(1)'; };
    removeBtn.onclick = function(e) {
      e.stopPropagation();
      container.innerHTML = '';
      input.value = '';
      pendingPostImage = null;
      showToast('Image removed');
    };
    wrapper.appendChild(img);
    wrapper.appendChild(removeBtn);
    container.appendChild(wrapper);
    pendingPostImage = e.target.result;
    showToast('Image attached! Click + to post 📷');
  };
  reader.onerror = function() { showToast('Failed to load image', 'error'); };
  reader.readAsDataURL(file);
}

function previewMultipleFiles(input, containerId, type) {
  const container = document.getElementById(containerId);
  if (!container || !input.files) return;
  Array.from(input.files).forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'document-preview-item';
      if (type === 'image') {
        itemDiv.style.backgroundImage = `url('${e.target.result}')`;
        itemDiv.innerHTML = `<button class="remove-doc-btn" data-index="${index}">×</button>`;
      } else {
        itemDiv.innerHTML = `
          <div class="doc-icon">📄</div>
          <div class="doc-name">${escapeHtml(file.name)}</div>
          <button class="remove-doc-btn" data-index="${index}">×</button>
        `;
      }
      container.appendChild(itemDiv);
    };
    reader.readAsDataURL(file);
  });
}

// ------------------------- API Data Loaders (Supabase) -------------------------
async function loadProfile() {
  try {
    const userId = User.getUser().id;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    
    profileData.name = data.name || '';
    profileData.bio = data.bio || '';
    profileData.tags = data.tags || [];
    profileData.contact = data.contact || { email: User.getUser().email, phone: '', location: '' };
    profileData.stats = data.stats || { connections: 0, litters: 0, rating: 0 };
    profileData.profileImg = data.profile_picture || '../html/assets/animals/doge.png';
    profileData.coverImg = data.cover_photo || 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200';
    updateProfileUI();
  } catch (err) {
    showToast('Failed to load profile', 'error');
  }
}

async function loadPosts() {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!author_id(name, profile_picture),
        likes:likes(user_id),
        comments:comments(*, author:profiles!author_id(name, profile_picture))
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    posts = data.map(post => ({
      id: post.id,
      author: post.author?.name,
      authorImg: post.author?.profile_picture,
      text: post.text,
      images: post.images,
      likes: post.likes?.length || 0,
      liked: post.likes?.some(l => l.user_id === User.getUser().id) || false,
      comments: (post.comments || []).map(comment => ({
        id: comment.id,
        author: comment.author?.name,
        authorImg: comment.author?.profile_picture,
        text: comment.text,
        createdAt: comment.created_at
      })),
      createdAt: post.created_at
    }));
    renderPosts();
  } catch (err) {
    showToast('Failed to load posts', 'error');
  }
}

async function loadAnimals() {
  try {
    const userId = User.getUser().id;
    const { data, error } = await supabase
      .from('pets')
      .select('*')
      .eq('owner_id', userId);
    
    if (error) throw error;
    animals = data || [];
    renderAnimals();
  } catch (err) {
    showToast('Failed to load animals', 'error');
  }
}

// ------------------------- UI Rendering -------------------------
function updateAllPostsAuthorImg() {
  posts.forEach(post => {
    if (post.author === profileData.name) post.authorImg = profileData.profileImg;
  });
  renderPosts();
}

function enableEditMode() {
  console.log('Enabling edit mode');
  isEditMode = true;
  updateProfileUI();
  renderPosts();
  renderAnimals();
  showToast('Edit mode enabled! You can now edit your posts and profile ✏️');
}

function updateProfileUI() {
  const profileName = document.getElementById('profileName');
  if (profileName) profileName.textContent = profileData.name;
  const bioContent = document.getElementById('bioContent');
  if (bioContent) bioContent.innerHTML = profileData.bio.split('\n').filter(p => p.trim()).map(p => `<p>${escapeHtml(p)}</p>`).join('');
  const connectionsCount = document.getElementById('connectionsCount');
  if (connectionsCount) connectionsCount.textContent = profileData.stats.connections;
  const littersCount = document.getElementById('littersCount');
  if (littersCount) littersCount.textContent = animals.length;
  const reviewsCount = document.getElementById('reviewsCount');
  if (reviewsCount) reviewsCount.textContent = profileData.stats.rating;
  const tagsContainer = document.getElementById('tagsContainer');
  if (tagsContainer) {
    tagsContainer.innerHTML = profileData.tags.map(tag => `<span class="tag">${escapeHtml(tag)} ${isEditMode ? '<span class="remove-tag" onclick="removeTag(this)">×</span>' : ''}</span>`).join('') + (isEditMode ? '<button class="add-tag-btn" onclick="addNewTag()">➕ Add Tag</button>' : '');
  }
  const editButtons = document.querySelectorAll('.edit-name-btn, .edit-bio-btn, .edit-contact-btn, .add-animal-btn');
  editButtons.forEach(btn => { if (btn) btn.style.display = isEditMode ? 'flex' : 'none'; });
  const coverOverlay = document.querySelector('.cover-overlay');
  if (coverOverlay) coverOverlay.style.display = isEditMode ? 'flex' : 'none';
  const profileImgOverlay = document.querySelector('.profile-img-overlay');
  if (profileImgOverlay) profileImgOverlay.style.display = isEditMode ? 'flex' : 'none';
  const addTagBtn = document.querySelector('.add-tag-btn');
  if (addTagBtn) addTagBtn.style.display = isEditMode ? 'inline-flex' : 'none';
  const profileImg = document.getElementById('profileImg');
  if (profileImg) profileImg.src = profileData.profileImg;
  const coverPhoto = document.getElementById('coverPhoto');
  if (coverPhoto) coverPhoto.style.backgroundImage = `url('${profileData.coverImg}')`;
}

function renderPosts() {
  const container = document.getElementById('postsContainer');
  if (!container) return;
  if (posts.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding: 60px; text-align: center;">No posts yet. Share your first update! 🐾</div>';
    return;
  }
  container.innerHTML = posts.map(post => `
    <div class="post-card reveal" data-post-id="${post.id}">
      <div class="post-header">
        <img src="${post.authorImg || '../html/assets/animals/doge.png'}" alt="${post.author || 'User'}">
        <div class="post-header-info">
          <div class="post-author">${escapeHtml(post.author || 'Unknown')}</div>
          <div class="post-time">${formatDate(post.createdAt) || 'Just now'}</div>
        </div>
        ${isEditMode ? `<button class="post-menu" onclick="event.stopPropagation(); openPostMenu(${post.id})" style="display: flex !important;">⋮</button>` : ''}
      </div>
      <div class="post-text">${escapeHtml(post.text)}</div>
      ${post.images && post.images.length > 0 ? `
        <div class="post-images ${post.images.length === 1 ? 'single-image' : 'multiple-images'}">
          ${post.images.map(img => `<img src="${img}" onclick="openLightbox('${img}')" loading="lazy">`).join('')}
        </div>
      ` : ''}
      <div class="post-meta">
        <span>${post.likes || 0} likes • ${post.comments?.length || 0} comments</span>
      </div>
      <div class="post-actions">
        <button class="${post.liked ? 'liked' : ''}" onclick="toggleLike(${post.id})">
          <span>${post.liked ? '❤️' : '🤍'}</span> ${post.liked ? 'Liked' : 'Like'}
        </button>
        <button onclick="focusComment(${post.id})">💬 Comment</button>
        <button class="${post.saved ? 'saved' : ''}" onclick="toggleSave(${post.id})">
          <span>${post.saved ? '🔖' : '📑'}</span> ${post.saved ? 'Saved' : 'Save'}
        </button>
        <button onclick="sharePost(${post.id})">🔗 Share</button>
      </div>
      <div class="comments-section">
        ${(post.comments || []).map(comment => `
          <div class="comment" data-comment-id="${comment.id}">
            <img src="${comment.authorImg || '../html/assets/animals/doge.png'}">
            <div class="comment-content">
              <span class="comment-author">${escapeHtml(comment.author || 'User')}</span>
              <span class="comment-text">${escapeHtml(comment.text)}</span>
            </div>
            ${isEditMode ? `
              <div class="comment-actions">
                <button onclick="editComment(${post.id}, ${comment.id}, '${escapeHtml(comment.text).replace(/'/g, "\\'")}')">✏️</button>
                <button onclick="deleteComment(${post.id}, ${comment.id})">🗑️</button>
              </div>
            ` : ''}
          </div>
        `).join('')}
        <div class="comment-box">
          <input type="text" id="comment-input-${post.id}" placeholder="Write a comment..." onkeypress="if(event.key==='Enter') addComment(${post.id})">
          <button onclick="addComment(${post.id})">Post</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderAnimals() {
  const grid = document.getElementById('animalsGrid');
  if (!grid) return;
  if (animals.length === 0) {
    grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;">No animals added yet. Click "Add Animal" to get started! 🐾</div>';
    return;
  }
  grid.innerHTML = animals.map(animal => `
    <div class="animal-card">
      <div class="animal-image-container" onclick="viewAnimal(${animal.id})">
        <img src="${animal.image}" alt="${animal.name}">
        <div class="view-overlay"><span class="view-text">👁️ View Profile</span></div>
      </div>
      ${isEditMode ? `
        <div class="animal-actions" onclick="event.stopPropagation()">
          <button class="animal-btn view-btn" onclick="viewAnimal(${animal.id})">👁️</button>
          <button class="animal-btn edit-btn" onclick="editAnimal(${animal.id})">✏️</button>
          <button class="animal-btn delete-btn" onclick="deleteAnimal(${animal.id})">🗑️</button>
        </div>
      ` : ''}
      <div class="animal-info">
        <div class="animal-name">${escapeHtml(animal.name)}</div>
        <div class="animal-breed">${escapeHtml(animal.breed)}</div>
        <div class="animal-meta">
          <span>${animal.gender === 'Male' ? '♂️' : '♀️'} ${escapeHtml(animal.age)}</span>
          <span class="animal-badge">${escapeHtml(animal.status)}</span>
        </div>
      </div>
    </div>
  `).join('');
}

// ------------------------- Profile Edit Functions (Supabase) -------------------------
function openCoverModal() {
  if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
  openModal('coverModal');
}
function openProfileModal() {
  if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
  openModal('profileModal');
}
function editName() {
  if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
  const nameInput = document.getElementById('nameInput');
  const profileName = document.getElementById('profileName');
  if (nameInput && profileName) nameInput.value = profileName.textContent;
  openModal('nameModal');
}
function editBio() {
  if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
  const bioContent = document.getElementById('bioContent');
  const bioInput = document.getElementById('bioInput');
  if (bioContent && bioInput) bioInput.value = bioContent.innerText.replace(/\n\n/g, '\n');
  openModal('bioModal');
}
function addNewTag() {
  if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
  openModal('tagModal');
}
function openAddAnimalModal() {
  if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
  openModal('animalModal');
}

async function saveCover() {
  const coverInput = document.getElementById('coverInput');
  if (coverInput && coverInput.files && coverInput.files[0]) {
    const file = coverInput.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const imageData = e.target.result;
        const { error } = await supabase
          .from('profiles')
          .update({ cover_photo: imageData })
          .eq('id', User.getUser().id);
        
        if (error) throw error;
        profileData.coverImg = imageData;
        updateProfileUI();
        showToast('Cover photo updated! 📸');
        closeModal('coverModal');
      } catch (err) { showToast('Failed to update cover', 'error'); }
    };
    reader.readAsDataURL(file);
  } else { showToast('Please select an image first', 'error'); }
}

async function saveProfile() {
  const profileInput = document.getElementById('profileInput');
  if (profileInput && profileInput.files && profileInput.files[0]) {
    const file = profileInput.files[0];
    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const imageData = e.target.result;
        const { error } = await supabase
          .from('profiles')
          .update({ profile_picture: imageData })
          .eq('id', User.getUser().id);
        
        if (error) throw error;
        profileData.profileImg = imageData;
        if (User.current) User.current.avatar = imageData;
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) profileBtn.innerHTML = `<img src="${imageData}" alt="Profile">`;
        updateAllPostsAuthorImg();
        updateProfileUI();
        showToast('Profile photo updated! 👤');
        closeModal('profileModal');
      } catch (err) { showToast('Failed to update profile photo', 'error'); }
    };
    reader.readAsDataURL(file);
  } else { showToast('Please select an image first', 'error'); }
}

async function saveName() {
  const input = document.getElementById('nameInput');
  if (input && input.value.trim()) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ name: input.value.trim() })
        .eq('id', User.getUser().id);
      
      if (error) throw error;
      profileData.name = input.value.trim();
      updateProfileUI();
      showToast('Name updated! ✏️');
      closeModal('nameModal');
    } catch (err) { showToast('Failed to update name', 'error'); }
  }
}

async function saveBio() {
  const input = document.getElementById('bioInput');
  if (input && input.value.trim()) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: input.value.trim() })
        .eq('id', User.getUser().id);
      
      if (error) throw error;
      profileData.bio = input.value.trim();
      updateProfileUI();
      showToast('Bio updated! 📝');
      closeModal('bioModal');
    } catch (err) { showToast('Failed to update bio', 'error'); }
  }
}

async function saveTag() {
  const input = document.getElementById('tagInput');
  if (input && input.value.trim()) {
    const newTags = [...profileData.tags, input.value.trim()];
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tags: newTags })
        .eq('id', User.getUser().id);
      
      if (error) throw error;
      profileData.tags = newTags;
      updateProfileUI();
      input.value = '';
      showToast('Tag added! 🏷️');
      closeModal('tagModal');
    } catch (err) { showToast('Failed to add tag', 'error'); }
  }
}

async function removeTag(element) {
  if (element && element.parentElement) {
    const tagText = element.parentElement.textContent.replace('×', '').trim();
    const newTags = profileData.tags.filter(t => t !== tagText);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ tags: newTags })
        .eq('id', User.getUser().id);
      
      if (error) throw error;
      profileData.tags = newTags;
      element.parentElement.remove();
      showToast('Tag removed 🗑️');
    } catch (err) { showToast('Failed to remove tag', 'error'); }
  }
}

function openContactModal() {
  if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
  const emailSpan = document.querySelector('#contactEmail span:last-child');
  const phoneSpan = document.querySelector('#contactPhone span:last-child');
  const locationSpan = document.querySelector('#contactLocation span:last-child');
  const email = emailSpan ? emailSpan.textContent : profileData.contact.email;
  const phone = phoneSpan ? phoneSpan.textContent : profileData.contact.phone;
  const location = locationSpan ? locationSpan.textContent : profileData.contact.location;
  const emailInput = document.getElementById('contactEmailInput');
  const phoneInput = document.getElementById('contactPhoneInput');
  const locationInput = document.getElementById('contactLocationInput');
  if (emailInput) emailInput.value = email;
  if (phoneInput) phoneInput.value = phone;
  if (locationInput) locationInput.value = location;
  openModal('contactModal');
}

async function saveContact() {
  const email = document.getElementById('contactEmailInput')?.value.trim();
  const phone = document.getElementById('contactPhoneInput')?.value.trim();
  const location = document.getElementById('contactLocationInput')?.value.trim();
  if (!email || !phone || !location) { showToast('Please fill in all fields', 'error'); return; }
  try {
    const newContact = { email, phone, location };
    const { error } = await supabase
      .from('profiles')
      .update({ contact: newContact })
      .eq('id', User.getUser().id);
    
    if (error) throw error;
    profileData.contact = newContact;
    const emailSpan = document.querySelector('#contactEmail span:last-child');
    const phoneSpan = document.querySelector('#contactPhone span:last-child');
    const locationSpan = document.querySelector('#contactLocation span:last-child');
    if (emailSpan) emailSpan.textContent = email;
    if (phoneSpan) phoneSpan.textContent = phone;
    if (locationSpan) locationSpan.textContent = location;
    showToast('Contact info updated! ✉️');
    closeModal('contactModal');
  } catch (err) { showToast('Failed to update contact', 'error'); }
}

function showConnections() { showToast(`You have ${profileData.stats.connections} connections! 🤝`); }
function showBioModal() {
  const bioContent = document.getElementById('bioContent');
  if (bioContent) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.style.display = 'flex';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 500px;">
        <button class="modal-close" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';">×</button>
        <h3>📝 About Me</h3>
        <div style="line-height: 1.8; color: var(--text-primary);">${bioContent.innerHTML}</div>
        <div class="modal-buttons" style="margin-top: 20px;">
          <button class="cancel-btn" onclick="this.closest('.modal').remove(); document.body.style.overflow = '';">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  }
}
function showLitters() { showToast(`Total litters: ${animals.length} 🐾`); }
function showReviews() { showToast(`Rating: ${profileData.stats.rating} ⭐ from verified breeders`); }

// ------------------------- Post Actions (Supabase) -------------------------
async function addPost() {
  const statusInput = document.getElementById('statusInput');
  if (!statusInput) return;
  const text = statusInput.value.trim();
  if (text || pendingPostImage) {
    let imageUrl = null;
    if (pendingPostImage && pendingPostImage.startsWith('data:')) {
      const blob = await fetch(pendingPostImage).then(r => r.blob());
      const fileName = `${Date.now()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from('post-images')
        .upload(fileName, blob);
      if (!uploadError) {
        const { data: publicUrl } = supabase.storage
          .from('post-images')
          .getPublicUrl(fileName);
        imageUrl = publicUrl.publicUrl;
      }
    }
    
    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: User.getUser().id,
        text: text || '',
        images: imageUrl ? [imageUrl] : []
      })
      .select();
    
    if (error) throw error;
    
    const newPost = {
      id: data[0].id,
      author: profileData.name,
      authorImg: profileData.profileImg,
      text: text || '',
      images: imageUrl ? [imageUrl] : [],
      likes: 0,
      liked: false,
      comments: [],
      createdAt: new Date().toISOString()
    };
    posts.unshift(newPost);
    renderPosts();
    statusInput.value = '';
    pendingPostImage = null;
    const postImageInput = document.getElementById('postImageInput');
    if (postImageInput) postImageInput.value = '';
    const imagePreview = document.getElementById('postImagePreview');
    if (imagePreview) imagePreview.innerHTML = '';
    showToast('Post published! 📢');
  } else { showToast('Please write something or attach an image', 'error'); }
}

function handlePostImageSelect(e) {
  const file = e.target.files[0];
  if (file) previewPostImage(e.target, 'postImagePreview');
}

function openPostMenu(postId) { currentPostId = postId; openModal('postMenuModal'); }
function editCurrentPost() {
  const post = posts.find(p => p.id === currentPostId);
  if (post) {
    const editText = document.getElementById('editPostText');
    if (editText) editText.value = post.text;
    closeModal('postMenuModal');
    openModal('editPostModal');
  }
}

async function savePostEdit() {
  const newText = document.getElementById('editPostText');
  if (currentPostId && newText) {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ text: newText.value.trim() || "" })
        .eq('id', currentPostId)
        .eq('author_id', User.getUser().id);
      
      if (error) throw error;
      const post = posts.find(p => p.id === currentPostId);
      if (post) post.text = newText.value.trim() || "";
      renderPosts();
      showToast('Post updated! ✏️');
      closeModal('editPostModal');
    } catch (err) { showToast('Failed to update post', 'error'); }
  }
}

async function deleteCurrentPost() {
  if (confirm('Are you sure you want to delete this post?')) {
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', currentPostId)
        .eq('author_id', User.getUser().id);
      
      if (error) throw error;
      posts = posts.filter(p => p.id !== currentPostId);
      renderPosts();
      showToast('Post deleted 🗑️');
      closeModal('postMenuModal');
    } catch (err) { showToast('Failed to delete post', 'error'); }
  }
}

function removePostImage() {
  pendingPostImage = null;
  const preview = document.getElementById('editPostPreview');
  const imageInput = document.getElementById('editPostImageInput');
  if (preview) { preview.style.backgroundImage = ''; preview.classList.remove('has-image'); }
  if (imageInput) imageInput.value = '';
  showToast('Image removed');
}

async function toggleLike(postId) {
  try {
    const userId = User.getUser().id;
    const post = posts.find(p => p.id === postId);
    if (!post) return;
    
    if (post.liked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);
      if (error) throw error;
      post.liked = false;
      post.likes--;
    } else {
      const { error } = await supabase
        .from('likes')
        .insert({ post_id: postId, user_id: userId });
      if (error) throw error;
      post.liked = true;
      post.likes++;
    }
    renderPosts();
  } catch (err) { showToast('Failed to like', 'error'); }
}

async function toggleSave(postId) {
  const post = posts.find(p => p.id === postId);
  if (post) {
    try {
      if (post.saved) {
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', User.getUser().id);
        if (error) throw error;
        post.saved = false;
      } else {
        const { error } = await supabase
          .from('saved_posts')
          .insert({ post_id: postId, user_id: User.getUser().id });
        if (error) throw error;
        post.saved = true;
      }
      renderPosts();
      showToast(post.saved ? 'Post saved! 🔖' : 'Post unsaved 📑');
    } catch (err) { showToast('Failed to save post', 'error'); }
  }
}

async function addComment(postId) {
  const input = document.getElementById(`comment-input-${postId}`);
  if (!input) return;
  const text = input.value.trim();
  if (text) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: User.getUser().id,
          text: text
        })
        .select();
      
      if (error) throw error;
      
      const newComment = {
        id: data[0].id,
        author: profileData.name,
        authorImg: profileData.profileImg,
        text: text,
        createdAt: new Date().toISOString()
      };
      
      const post = posts.find(p => p.id === postId);
      if (post) {
        post.comments.push(newComment);
        renderPosts();
      }
      showToast('Comment added! 💬');
      input.value = '';
    } catch (err) { showToast('Failed to add comment', 'error'); }
  }
}

function focusComment(postId) { const input = document.getElementById(`comment-input-${postId}`); if (input) input.focus(); }
function sharePost(postId) { copyToClipboard(`https://breedlink.com/post/${postId}`); showToast('Link copied to clipboard! 🔗'); }

function editComment(postId, commentId, currentText) {
  currentComment = { postId, commentId };
  const editText = document.getElementById('editCommentText');
  if (editText) editText.value = currentText;
  openModal('commentEditModal');
}

async function saveCommentEdit() {
  if (!currentComment) return;
  const newText = document.getElementById('editCommentText');
  if (newText && newText.value.trim()) {
    try {
      const { error } = await supabase
        .from('comments')
        .update({ text: newText.value.trim() })
        .eq('id', currentComment.commentId)
        .eq('author_id', User.getUser().id);
      
      if (error) throw error;
      const post = posts.find(p => p.id === currentComment.postId);
      if (post) {
        const comment = post.comments.find(c => c.id === currentComment.commentId);
        if (comment) comment.text = newText.value.trim();
        renderPosts();
      }
      showToast('Comment updated ✏️');
    } catch (err) { showToast('Failed to update comment', 'error'); }
  }
  closeModal('commentEditModal');
  currentComment = null;
}

async function deleteComment(postId, commentId) {
  if (confirm('Delete this comment?')) {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('author_id', User.getUser().id);
      
      if (error) throw error;
      const post = posts.find(p => p.id === postId);
      if (post) {
        post.comments = post.comments.filter(c => c.id !== commentId);
        renderPosts();
      }
      showToast('Comment deleted 🗑️');
    } catch (err) { showToast('Failed to delete comment', 'error'); }
  }
}

// ------------------------- Animal Actions (Supabase) -------------------------
function viewAnimal(animalId) {
  const animal = animals.find(a => a.id === animalId);
  if (!animal) return;
  const content = document.getElementById('viewAnimalContent');
  const hasDocs = (animal.healthDocuments && animal.healthDocuments.length > 0) || (animal.healthCertificates && animal.healthCertificates.length > 0);
  content.innerHTML = `
    <div class="view-animal-content">
      <img src="${animal.image}" alt="${animal.name}" class="view-animal-image">
      <div class="view-animal-name">${escapeHtml(animal.name)} ${animal.gender === 'Male' ? '♂️' : '♀️'}</div>
      <div class="view-animal-breed">${escapeHtml(animal.breed)}</div>
      <div class="view-animal-details">
        <div class="view-detail-item"><div class="view-detail-label">Age</div><div class="view-detail-value">${escapeHtml(animal.age)}</div></div>
        <div class="view-detail-item"><div class="view-detail-label">Status</div><div class="view-detail-value">${escapeHtml(animal.status)}</div></div>
        <div class="view-detail-item"><div class="view-detail-label">Litters</div><div class="view-detail-value">${animal.litterCount || 0}</div></div>
        <div class="view-detail-item"><div class="view-detail-label">Partner</div><div class="view-detail-value">${animal.partner || 'None'}</div></div>
        ${animal.description ? `<div class="view-detail-item full-width"><div class="view-detail-label">About</div><div class="view-detail-value">${escapeHtml(animal.description)}</div></div>` : ''}
      </div>
      <div class="view-certificates">
        <h4>📋 Health Documents & Certificates</h4>
        <div class="cert-list" id="animalDocsList">
          ${hasDocs ? 
            (animal.healthCertificates || []).map(cert => `<span class="cert-badge" onclick="openDocument('${cert}')">📄 ${escapeHtml(cert)}</span>`).join('') +
            (animal.healthDocuments || []).map(doc => `<span class="cert-badge" onclick="openDocument('${doc.url || doc}')">📎 ${escapeHtml(doc.name || doc)}</span>`).join('')
            : '<span class="cert-badge none">No documents added yet</span>'}
        </div>
      </div>
      <div class="view-modal-actions">
        <button class="btn-close-view" onclick="closeModal('viewAnimalModal')">Close</button>
        ${isEditMode ? `<button class="btn-edit" onclick="closeModal('viewAnimalModal'); setTimeout(() => editAnimal(${animal.id}), 300)">✏️ Edit Info</button>` : ''}
      </div>
    </div>
  `;
  openModal('viewAnimalModal');
}

function openDocument(docUrl) {
  if (docUrl.startsWith('data:') || docUrl.startsWith('blob:')) window.open(docUrl, '_blank');
  else showToast(`Opening document: ${docUrl}`, 'success');
}

function editAnimal(animalId) {
  if (!isEditMode) { showToast('Please click Customize Profile first to edit', 'error'); return; }
  currentAnimalId = animalId;
  const animal = animals.find(a => a.id === animalId);
  if (!animal) return;
  const content = document.getElementById('animalDetailContent');
  const title = document.getElementById('animalDetailTitle');
  title.innerText = `✏️ Edit ${animal.name}`;
  content.innerHTML = `
    <div class="animal-detail-grid">
      <div class="animal-detail-item"><label>Name *</label><input type="text" id="edit_name" value="${escapeHtml(animal.name)}"></div>
      <div class="animal-detail-item"><label>Breed *</label><input type="text" id="edit_breed" value="${escapeHtml(animal.breed)}"></div>
      <div class="animal-detail-item"><label>Gender</label><select id="edit_gender"><option value="Male" ${animal.gender === 'Male' ? 'selected' : ''}>♂️ Male</option><option value="Female" ${animal.gender === 'Female' ? 'selected' : ''}>♀️ Female</option></select></div>
      <div class="animal-detail-item"><label>Age</label><input type="text" id="edit_age" value="${escapeHtml(animal.age)}"></div>
      <div class="animal-detail-item"><label>Status</label><input type="text" id="edit_status" value="${escapeHtml(animal.status)}"></div>
      <div class="animal-detail-item"><label>Litter Count</label><input type="number" id="edit_litterCount" value="${animal.litterCount || 0}" min="0"></div>
      <div class="animal-detail-item" style="grid-column: 1/-1;"><label>Description</label><textarea id="edit_description" rows="3">${escapeHtml(animal.description || '')}</textarea></div>
      <div class="animal-detail-item" style="grid-column: 1/-1;">
        <label>Health Documents (PDF, Images)</label>
        <input type="file" id="edit_documents" accept="image/*,application/pdf" multiple>
        <div id="edit_documentsPreview" class="documents-preview"></div>
      </div>
    </div>
    <div class="image-upload-group"><label>Animal Photo</label><div class="image-preview-small" id="edit_imagePreview" style="background-image: url('${animal.image}');" onclick="document.getElementById('edit_imageInput').click()"><span>📷 Change</span></div><input type="file" id="edit_imageInput" accept="image/*" style="display: none;"></div>
  `;
  const docInput = document.getElementById('edit_documents');
  if (docInput) docInput.onchange = function(e) { previewMultipleFiles(e.target, 'edit_documentsPreview', 'document'); };
  openModal('animalDetailModal');
}

async function saveAnimalDetails() {
  const animal = animals.find(a => a.id === currentAnimalId);
  if (!animal) return;
  const name = document.getElementById('edit_name')?.value.trim();
  const breed = document.getElementById('edit_breed')?.value.trim();
  if (!name || !breed) { showToast('Name and breed are required!', 'error'); return; }
  
  animal.name = name;
  animal.breed = breed;
  animal.gender = document.getElementById('edit_gender')?.value || animal.gender;
  animal.age = document.getElementById('edit_age')?.value.trim() || animal.age;
  animal.status = document.getElementById('edit_status')?.value.trim() || animal.status;
  animal.litterCount = parseInt(document.getElementById('edit_litterCount')?.value) || 0;
  animal.description = document.getElementById('edit_description')?.value.trim() || '';
  
  const imgInput = document.getElementById('edit_imageInput');
  if (imgInput && imgInput.files && imgInput.files[0]) {
    const reader = new FileReader();
    reader.onload = async function(e) {
      animal.image = e.target.result;
      await finishSave();
    };
    reader.readAsDataURL(imgInput.files[0]);
  } else { await finishSave(); }
  
  async function finishSave() {
    try {
      const { error } = await supabase
        .from('pets')
        .update({
          name: animal.name,
          breed: animal.breed,
          gender: animal.gender,
          age: animal.age,
          status: animal.status,
          image: animal.image,
          description: animal.description,
          litter_count: animal.litterCount
        })
        .eq('id', currentAnimalId)
        .eq('owner_id', User.getUser().id);
      
      if (error) throw error;
      const index = animals.findIndex(a => a.id === currentAnimalId);
      if (index !== -1) animals[index] = animal;
      renderAnimals();
      showToast('Animal updated successfully! 🐾');
      closeModal('animalDetailModal');
    } catch (err) { showToast('Failed to update animal', 'error'); }
  }
}

async function saveAnimal() {
  const name = document.getElementById('animalName')?.value.trim();
  const breed = document.getElementById('animalBreed')?.value.trim();
  const gender = document.getElementById('animalGender')?.value;
  const age = document.getElementById('animalAge')?.value.trim();
  const status = document.getElementById('animalStatus')?.value.trim();
  const preview = document.getElementById('animalPreview');
  
  if (!name || !breed) { showToast('Please fill in Name and Breed!', 'error'); return; }
  
  let imageUrl = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400';
  if (preview && preview.style.backgroundImage && preview.style.backgroundImage !== 'none') {
    imageUrl = preview.style.backgroundImage.slice(4, -1).replace(/"/g, "");
  }
  
  try {
    const { data, error } = await supabase
      .from('pets')
      .insert({
        owner_id: User.getUser().id,
        name: name,
        breed: breed,
        gender: gender || 'Unknown',
        age: age || 'Unknown',
        status: status || 'Available',
        image: imageUrl,
        description: '',
        litter_count: 0
      })
      .select();
    
    if (error) throw error;
    animals.push(data[0]);
    renderAnimals();
    
    document.getElementById('animalName').value = '';
    document.getElementById('animalBreed').value = '';
    document.getElementById('animalGender').value = '';
    document.getElementById('animalAge').value = '';
    document.getElementById('animalStatus').value = '';
    if (preview) {
      preview.style.backgroundImage = '';
      preview.classList.remove('has-image');
      preview.innerHTML = '<span>📤 Click to upload animal photo</span>';
    }
    showToast('Animal added successfully! 🐾');
    closeModal('animalModal');
  } catch (err) { showToast('Failed to add animal', 'error'); }
}

async function deleteAnimal(id) {
  if (confirm('Are you sure you want to remove this animal?')) {
    try {
      const { error } = await supabase
        .from('pets')
        .delete()
        .eq('id', id)
        .eq('owner_id', User.getUser().id);
      
      if (error) throw error;
      animals = animals.filter(a => a.id !== id);
      renderAnimals();
      showToast('Animal removed 🗑️');
    } catch (err) { showToast('Failed to delete animal', 'error'); }
  }
}

// ------------------------- Messenger (Placeholder - to be implemented) -------------------------
function openMessenger() {
  const overlay = document.getElementById('messengerOverlay');
  if (overlay) {
    overlay.classList.add('active');
    overlay.style.display = 'flex';
  }
}

function closeMessenger() {
  const overlay = document.getElementById('messengerOverlay');
  if (overlay) {
    overlay.classList.remove('active');
    overlay.style.display = 'none';
  }
  currentChatId = null;
}

function renderContacts() {
  const container = document.getElementById('contactsListContainer');
  if (!container) return;
  container.innerHTML = '<div style="text-align: center; padding: 40px;">Messaging coming soon</div>';
}

function openChat(contactId) {
  showToast('Chat feature coming soon');
}

function closeChat() {
  const messengerContacts = document.getElementById('messengerContacts');
  const messengerChat = document.getElementById('messengerChat');
  const messengerEmpty = document.getElementById('messengerEmpty');
  if (messengerContacts) messengerContacts.style.display = 'block';
  if (messengerChat) messengerChat.style.display = 'none';
  if (messengerEmpty) messengerEmpty.style.display = 'flex';
  currentChatId = null;
}

function sendMessage() {
  showToast('Messaging coming soon');
}

function searchContacts(query) {}

function handleMessageInput(event) {}

function sendImage(fileInput) {}

function handleIncomingChatRequest() {}

// ------------------------- Event Listeners & Init -------------------------
function setupEventListeners() {
  const postImageInput = document.getElementById('postImageInput');
  if (postImageInput) postImageInput.addEventListener('change', handlePostImageSelect);
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', function(e) { if (e.target === this) closeModal(this.id); });
  });
  const lightboxModal = document.getElementById('lightboxModal');
  if (lightboxModal) lightboxModal.addEventListener('click', function(e) { if (e.target === this) { closeModal('lightboxModal'); document.body.style.overflow = ''; } });
}

document.addEventListener('DOMContentLoaded', async function() {
  if (!User.isAuthenticated()) { 
    window.location.href = 'login.html'; 
    return; 
  }
  await loadProfile();
  await loadPosts();
  await loadAnimals();
  
  const urlParams = new URLSearchParams(window.location.search);
  const enableEdit = urlParams.get('edit') === 'true' || sessionStorage.getItem('enableEdit') === 'true';
  if (enableEdit) { 
    enableEditMode(); 
    sessionStorage.removeItem('enableEdit'); 
  }
  updateProfileUI();
  renderPosts();
  renderAnimals();
  renderContacts();
  setupEventListeners();
  handleIncomingChatRequest();
});

// Expose functions to window for inline onclick handlers
window.openModal = openModal;
window.closeModal = closeModal;
window.previewImage = previewImage;
window.previewPostImage = previewPostImage;
window.openLightbox = openLightbox;
window.viewAnimal = viewAnimal;
window.editAnimal = editAnimal;
window.deleteAnimal = deleteAnimal;
window.saveAnimalDetails = saveAnimalDetails;
window.saveAnimal = saveAnimal;
window.openAddAnimalModal = openAddAnimalModal;
window.openCoverModal = openCoverModal;
window.openProfileModal = openProfileModal;
window.editName = editName;
window.editBio = editBio;
window.addNewTag = addNewTag;
window.saveCover = saveCover;
window.saveProfile = saveProfile;
window.saveName = saveName;
window.saveBio = saveBio;
window.saveTag = saveTag;
window.removeTag = removeTag;
window.saveContact = saveContact;
window.openContactModal = openContactModal;
window.addPost = addPost;
window.openPostMenu = openPostMenu;
window.editCurrentPost = editCurrentPost;
window.savePostEdit = savePostEdit;
window.deleteCurrentPost = deleteCurrentPost;
window.toggleLike = toggleLike;
window.toggleSave = toggleSave;
window.addComment = addComment;
window.focusComment = focusComment;
window.sharePost = sharePost;
window.editComment = editComment;
window.saveCommentEdit = saveCommentEdit;
window.deleteComment = deleteComment;
window.openMessenger = openMessenger;
window.closeMessenger = closeMessenger;
window.openChat = openChat;
window.closeChat = closeChat;
window.sendMessage = sendMessage;
window.searchContacts = searchContacts;
window.openDocument = openDocument;
window.enableEditMode = enableEditMode;
window.showConnections = showConnections;
window.showBioModal = showBioModal;
window.showLitters = showLitters;
window.showReviews = showReviews;
window.sendImage = sendImage;
window.handleMessageInput = handleMessageInput;
