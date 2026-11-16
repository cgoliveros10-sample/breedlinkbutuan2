// upload.js — BreedLink image/file upload helpers
// Uses window.supabase.storage (from db.js); db.js owns all token refresh logic.

// Private buckets use signed URLs; add 'messages' once its policies are updated
const PRIVATE_BUCKETS = ['documents'];

const StorageAPI = {

    async _getUserId() {
        if (window.User && window.User.current && window.User.current.id) {
            return window.User.current.id;
        }
        try {
            const str = sessionStorage.getItem('breedlink_user');
            if (str) {
                const u = JSON.parse(str);
                if (u && u.id && u.id !== 'null') return u.id;
            }
        } catch (e) {}
        try {
            const { data } = await window.supabase.auth.getUser();
            if (data?.user?.id) return data.user.id;
        } catch (e) {}
        return null;
    },

    _isPrivate(bucket) {
        return PRIVATE_BUCKETS.includes(bucket);
    },

    // Accepts an old public URL or a plain path and returns the plain path.
    _toPath(bucket, value) {
        if (!value) return '';
        const markers = [
            `/storage/v1/object/public/${bucket}/`,
            `/storage/v1/object/sign/${bucket}/`,
            `/storage/v1/object/authenticated/${bucket}/`
        ];
        for (const marker of markers) {
            const i = value.indexOf(marker);
            if (i >= 0) {
                return decodeURIComponent(value.slice(i + marker.length).split('?')[0]);
            }
        }
        return value;
    },

    // Signed URL for private buckets; returns the stored value unchanged for public ones.
    async getSignedUrl(bucket, stored, expiresIn = 3600) {
        if (!stored) throw new Error('No file to open');
        if (!this._isPrivate(bucket)) return stored;
        if (!window.supabase) throw new Error('Supabase not configured');

        const path = this._toPath(bucket, stored);
        const store = window.supabase.storage.from(bucket);

        if (typeof store.createSignedUrl !== 'function') {
            throw new Error('createSignedUrl is not available in db.js storage client');
        }

        const { data, error } = await store.createSignedUrl(path, expiresIn);
        if (error) throw new Error(error.message || error.error || 'Could not open file');
        return data.signedUrl || data.signedURL;
    },

    async uploadImage(file, bucket) {
        console.log('[StorageAPI] Uploading to', bucket, ':', file.name);

        if (!window.supabase) throw new Error('Supabase not configured');

        const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
        const MAX_SIZE_BYTES = 10 * 1024 * 1024;
        if (!ALLOWED_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Only JPEG, PNG, GIF, WebP, and AVIF are allowed.');
        }
        if (file.size > MAX_SIZE_BYTES) {
            throw new Error('File exceeds the 10 MB size limit.');
        }

        const userId = await this._getUserId();
        if (!userId) throw new Error('Not authenticated — please log in again');

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileExt   = (file.name.split('.').pop() || 'jpg').toLowerCase();
        const filePath  = `${userId}/${timestamp}_${randomStr}.${fileExt}`;

        console.log('[StorageAPI] Upload path:', filePath);

        const { error } = await window.supabase.storage.from(bucket).upload(filePath, file);
        if (error) throw new Error(error.message || error.error || 'Upload failed');

        if (this._isPrivate(bucket)) {
            console.log('[StorageAPI] Uploaded (private) path:', filePath);
            return filePath;
        }

        const { data } = window.supabase.storage.from(bucket).getPublicUrl(filePath);
        console.log('[StorageAPI] Uploaded URL:', data.publicUrl);
        return data.publicUrl;
    },

    async uploadDocument(file) {
        if (!window.supabase) throw new Error('Supabase not configured');

        const ALLOWED_DOC_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
        const MAX_DOC_BYTES = 10 * 1024 * 1024;
        if (!ALLOWED_DOC_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Only PDF, JPEG, PNG, and WebP are allowed.');
        }
        if (file.size > MAX_DOC_BYTES) {
            throw new Error('File exceeds the 10 MB size limit.');
        }

        const userId = await this._getUserId();
        if (!userId) throw new Error('Please log in first');

        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileExt   = (file.name.split('.').pop() || 'pdf').toLowerCase();
        const filePath  = `${userId}/${timestamp}_${randomStr}.${fileExt}`;

        const { error } = await window.supabase.storage.from('documents').upload(filePath, file);
        if (error) throw new Error(error.message || 'Document upload failed');

        // 'url' holds the path; open it with getSignedUrl('documents', doc.url).
        return { url: filePath, path: filePath, name: file.name, type: file.type, size: file.size };
    },

    async uploadProfilePicture(file) { return this.uploadImage(file, 'avatars');   },
    async uploadCoverPhoto(file)     { return this.uploadImage(file, 'covers');    },
    async uploadAnimalImage(file)    { return this.uploadImage(file, 'animals');   },
    async uploadPostImage(file)      { return this.uploadImage(file, 'posts');     },
    async uploadMessageImage(file)   { return this.uploadImage(file, 'messages'); },
    async uploadAnimalDocument(file) { return this.uploadDocument(file);           },
};

window.StorageAPI = StorageAPI;
console.log('StorageAPI ready');
