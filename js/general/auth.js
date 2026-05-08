const User = {
  current: null,

  async login(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Profile fetch error:', profileError);
      }
      
      this.current = {
        id: data.user.id,
        name: profile?.name || data.user.email.split('@')[0],
        email: data.user.email,
        avatar: profile?.profile_picture || '../html/assets/animals/doge.png',
        coverPhoto: profile?.cover_photo || 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200',
        bio: profile?.bio || '',
        tags: profile?.tags || [],
        accountType: profile?.account_type || 'breeder',
        contact: profile?.contact || { email: data.user.email, phone: '', location: '' },
        stats: profile?.stats || { connections: 0, litters: 0, rating: 0 }
      };
      
      localStorage.setItem('breedlink_token', data.session.access_token);
      localStorage.setItem('breedlink_user', JSON.stringify(this.current));
      return this.current;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async signup(userData) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            account_type: userData.accountType
          }
        }
      });
      
      if (error) throw new Error(error.message);
      if (!data.user) throw new Error('Signup failed');
      
      const defaultContact = {
        email: userData.email,
        phone: '',
        location: 'Butuan City, Philippines'
      };
      
      const defaultStats = {
        connections: 0,
        litters: 0,
        rating: 0
      };
      
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          name: userData.name,
          account_type: userData.accountType,
          profile_picture: '../html/assets/animals/doge.png',
          cover_photo: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200',
          bio: '',
          tags: [],
          contact: defaultContact,
          stats: defaultStats
        });
      
      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
      
      this.current = {
        id: data.user.id,
        name: userData.name,
        email: userData.email,
        avatar: '../html/assets/animals/doge.png',
        coverPhoto: 'https://images.unsplash.com/photo-1450778869180-41d0601e046e?w=1200',
        bio: '',
        tags: [],
        accountType: userData.accountType,
        contact: defaultContact,
        stats: defaultStats
      };
      
      localStorage.setItem('breedlink_token', data.session?.access_token || '');
      localStorage.setItem('breedlink_user', JSON.stringify(this.current));
      return this.current;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async logout() {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
    this.current = null;
    localStorage.removeItem('breedlink_token');
    localStorage.removeItem('breedlink_user');
    if (typeof showToast === 'function') showToast('Logged out successfully 👋');
    setTimeout(() => window.location.href = '../index.html', 500);
  },

  isAuthenticated() {
    if (!this.current) {
      const stored = localStorage.getItem('breedlink_user');
      if (stored) this.current = JSON.parse(stored);
    }
    return this.current !== null && !!localStorage.getItem('breedlink_token');
  },

  getToken() {
    return localStorage.getItem('breedlink_token');
  },

  getUser() {
    if (!this.current) {
      const stored = localStorage.getItem('breedlink_user');
      if (stored) this.current = JSON.parse(stored);
    }
    return this.current;
  },

  async updateUser(updates) {
    try {
      const updateData = {};
      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.bio !== undefined) updateData.bio = updates.bio;
      if (updates.tags !== undefined) updateData.tags = updates.tags;
      if (updates.contact !== undefined) updateData.contact = updates.contact;
      if (updates.stats !== undefined) updateData.stats = updates.stats;
      if (updates.profilePicture !== undefined) updateData.profile_picture = updates.profilePicture;
      if (updates.coverPhoto !== undefined) updateData.cover_photo = updates.coverPhoto;
      
      const { data, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', this.current.id)
        .select();
      
      if (error) throw new Error(error.message);
      
      this.current = { ...this.current, ...updates };
      if (data && data[0]) {
        this.current.avatar = data[0].profile_picture || this.current.avatar;
        this.current.coverPhoto = data[0].cover_photo || this.current.coverPhoto;
        this.current.bio = data[0].bio || this.current.bio;
        this.current.tags = data[0].tags || this.current.tags;
        this.current.contact = data[0].contact || this.current.contact;
        this.current.stats = data[0].stats || this.current.stats;
      }
      
      localStorage.setItem('breedlink_user', JSON.stringify(this.current));
      return this.current;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw new Error(error.message);
      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  },

  async getUsersByType(accountType) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('account_type', accountType);
      
      if (error) throw new Error(error.message);
      return data;
    } catch (error) {
      throw new Error(error.message);
    }
  }
};

function checkPasswordStrength(password) {
  let strength = 0;
  let feedback = [];
  if (password.length >= 8) strength++; else feedback.push('At least 8 characters');
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++; else feedback.push('Include both uppercase and lowercase letters');
  if (password.match(/[0-9]/) && password.match(/[^a-zA-Z0-9]/)) strength++; else feedback.push('Include numbers and special characters');
  const strengthLevels = ['Very Weak', 'Weak', 'Fair', 'Strong'];
  const strengthColors = ['#FF6B6B', '#FFA06B', '#FFD93D', '#4CAF50'];
  return { score: strength, text: strengthLevels[strength], color: strengthColors[strength], feedback };
}

function updatePasswordStrength(passwordInput, strengthContainerId) {
  if (!passwordInput) return;
  const container = document.getElementById(strengthContainerId);
  if (!container) return;
  const password = passwordInput.value;
  const strength = checkPasswordStrength(password);
  const segments = container.querySelectorAll('.strength-segment');
  segments.forEach((segment, index) => {
    segment.className = 'strength-segment';
    if (index < strength.score) {
      if (strength.score === 1) segment.classList.add('weak');
      else if (strength.score === 2) segment.classList.add('medium');
      else if (strength.score === 3) segment.classList.add('strong');
    }
  });
  const strengthText = container.querySelector('.strength-text');
  if (strengthText) strengthText.innerHTML = `<span style="color: ${strength.color}">${strength.text}</span>`;
  const feedbackDiv = container.querySelector('.strength-feedback');
  if (feedbackDiv) {
    if (strength.score < 3 && password.length > 0) {
      feedbackDiv.innerHTML = strength.feedback.map(f => `• ${f}`).join('<br>');
      feedbackDiv.style.display = 'block';
    } else {
      feedbackDiv.style.display = 'none';
    }
  }
}

function togglePassword(inputId, buttonElement) {
  const input = document.getElementById(inputId);
  if (input) {
    if (input.type === 'password') {
      input.type = 'text';
      buttonElement.textContent = '🙈';
    } else {
      input.type = 'password';
      buttonElement.textContent = '👁️';
    }
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = document.getElementById('email')?.value;
  const password = document.getElementById('password')?.value;
  const submitBtn = document.getElementById('submitBtn');
  const rememberMe = document.getElementById('rememberMe')?.checked;
  
  if (!email || !password) return showToast('Please fill in all fields', 'error');
  if (!Validators.email(email)) return showToast('Please enter a valid email', 'error');
  if (!Validators.password(password)) return showToast('Password must be at least 8 characters', 'error');
  
  if (submitBtn) {
    submitBtn.classList.add('loading');
    submitBtn.textContent = 'Signing in...';
  }
  
  try {
    const user = await User.login(email, password);
    if (rememberMe) localStorage.setItem('breedlink_remember', email);
    else localStorage.removeItem('breedlink_remember');
    showToast(`Welcome back, ${user.name}! 🎉`);
    setTimeout(() => window.location.href = 'profile.html', 800);
  } catch (error) {
    showToast(error.message, 'error');
    if (submitBtn) {
      submitBtn.classList.remove('loading');
      submitBtn.textContent = 'Sign In →';
    }
  }
}

async function handleSignup(event) {
  event.preventDefault();
  const name = document.getElementById('fullName')?.value;
  const email = document.getElementById('email')?.value;
  const password = document.getElementById('password')?.value;
  const confirmPassword = document.getElementById('confirmPassword')?.value;
  const terms = document.getElementById('terms')?.checked;
  const selected = document.querySelector('.account-type.selected');
  const accountType = selected?.getAttribute('data-type') || 'breeder';
  
  if (!name || !email || !password) return showToast('Please fill in all fields', 'error');
  if (!Validators.name(name)) return showToast('Please enter a valid name (≥2 characters)', 'error');
  if (!Validators.email(email)) return showToast('Please enter a valid email', 'error');
  if (!Validators.password(password)) return showToast('Password must be at least 8 characters', 'error');
  if (password !== confirmPassword) return showToast('Passwords do not match', 'error');
  if (!terms) return showToast('Please accept the Terms of Service', 'error');
  
  const btn = document.getElementById('createBtn');
  if (btn) {
    btn.textContent = 'Creating...';
    btn.disabled = true;
  }
  
  try {
    const user = await User.signup({ name, email, password, accountType });
    showToast(`Welcome to BreedLink, ${user.name}! 🎉`);
    setTimeout(() => window.location.href = 'profile.html', 800);
  } catch (error) {
    showToast(error.message, 'error');
    if (btn) {
      btn.textContent = 'Create Account';
      btn.disabled = false;
    }
  }
}

function checkAuth() {
  if (User.isAuthenticated()) {
    const loginLink = document.querySelector('a[href="login.html"]');
    const signupLink = document.querySelector('a[href="sign_up.html"]');
    const profileLink = document.querySelector('a[href="profile.html"]');
    if (loginLink) loginLink.style.display = 'none';
    if (signupLink) signupLink.style.display = 'none';
    if (profileLink) profileLink.style.display = 'inline-block';
  }
}

function autoFillRememberedEmail() {
  const rememberedEmail = localStorage.getItem('breedlink_remember');
  const emailInput = document.getElementById('email');
  const rememberCheckbox = document.getElementById('rememberMe');
  if (rememberedEmail && emailInput) {
    emailInput.value = rememberedEmail;
    if (rememberCheckbox) rememberCheckbox.checked = true;
  }
}

function initNavigation() {
  updateNavForAuthStatus();
  highlightActiveNavLink();
}

function updateNavForAuthStatus() {
  const isLoggedIn = User.isAuthenticated();
  const user = User.getUser();
  const messageBtn = document.getElementById('messageBtn');
  const profileMenu = document.getElementById('profileMenuContainer');
  const guestOptions = document.getElementById('guestOptions');

  if (isLoggedIn && user) {
    if (messageBtn) messageBtn.style.display = 'flex';
    if (profileMenu) {
      profileMenu.style.display = 'block';
      const profileBtn = document.getElementById('profileBtn');
      if (profileBtn && user.avatar) {
        profileBtn.innerHTML = `<img src="${user.avatar}" alt="${user.name}">`;
      }
    }
    if (guestOptions) guestOptions.style.display = 'none';
  } else {
    if (messageBtn) messageBtn.style.display = 'none';
    if (profileMenu) profileMenu.style.display = 'none';
    if (guestOptions) guestOptions.style.display = 'flex';
  }
}

function highlightActiveNavLink() {
  const currentPath = window.location.pathname;
  const currentFile = currentPath.split('/').pop() || 'index.html';
  
  const navLinks = {
    'index.html': 'nav-home',
    'home.html': 'nav-home',
    'about.html': 'nav-about',
    'swipe.html': 'nav-breeders'
  };
  
  let activeId = null;
  for (const [file, id] of Object.entries(navLinks)) {
    if (currentFile === file) {
      activeId = id;
      break;
    }
  }
  
  if (!activeId && currentFile === 'profile.html') {
    const homeLink = document.getElementById('nav-home');
    const aboutLink = document.getElementById('nav-about');
    const breedersLink = document.getElementById('nav-breeders');
    if (homeLink) homeLink.classList.remove('active');
    if (aboutLink) aboutLink.classList.remove('active');
    if (breedersLink) breedersLink.classList.remove('active');
    return;
  }
  
  document.querySelectorAll('.menu a').forEach(link => link.classList.remove('active'));
  
  if (activeId) {
    const activeLink = document.getElementById(activeId);
    if (activeLink) activeLink.classList.add('active');
  }
}

function toggleProfileDropdown() {
  document.getElementById('profileDropdown')?.classList.toggle('active');
}

function handleLogout() {
  if (confirm('Are you sure you want to logout? 👋')) User.logout();
}

function protectSwipePage() {
  if (!window.location.pathname.includes('swipe.html')) return;
  if (!User.isAuthenticated()) {
    sessionStorage.setItem('redirectAfterLogin', 'swipe.html');
    window.location.href = 'login.html';
  }
}

function openMessengerGlobal() {
  if (typeof window.openMessenger === 'function') window.openMessenger();
  else setTimeout(() => openMessengerGlobal(), 500);
}

window.User = User;
window.checkPasswordStrength = checkPasswordStrength;
window.updatePasswordStrength = updatePasswordStrength;
window.togglePassword = togglePassword;
window.handleLogin = handleLogin;
window.handleSignup = handleSignup;
window.checkAuth = checkAuth;
window.autoFillRememberedEmail = autoFillRememberedEmail;
window.initNavigation = initNavigation;
window.updateNavForAuthStatus = updateNavForAuthStatus;
window.toggleProfileDropdown = toggleProfileDropdown;
window.handleLogout = handleLogout;
window.protectSwipePage = protectSwipePage;
window.openMessengerGlobal = openMessengerGlobal;
