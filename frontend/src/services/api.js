import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api'
});

// Public Blog APIs
export const fetchPublishedBlogs = async (search = '', tag = '', page = 1, limit = 6, sort = 'latest') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (tag) params.append('tag', tag);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    if (sort) params.append('sort', sort);

    const response = await API.get(`/blogs?${params.toString()}`);
    return response.data;
};

export const fetchBlogById = async (id) => {
    const response = await API.get(`/blogs/${id}`);
    return response.data;
};

export const fetchPopularBlogs = async (limit = 5) => {
    const response = await API.get(`/blogs/popular?limit=${limit}`);
    return response.data;
};

export const fetchRecentBlogs = async (limit = 5) => {
    const response = await API.get(`/blogs/recent?limit=${limit}`);
    return response.data;
};

export const fetchRelatedBlogs = async (id) => {
    const response = await API.get(`/blogs/${id}/related`);
    return response.data;
};

export const likeBlog = async (id, clientId) => {
    const response = await API.post(`/blogs/${id}/like`, { clientId });
    return response.data;
};

export const addComment = async (id, commentData) => {
    const response = await API.post(`/blogs/${id}/comments`, commentData);
    return response.data;
};

export const incrementBlogView = async (id) => {
    const response = await API.post(`/blogs/${id}/view`);
    return response.data;
};


// Automatically attach JWT token to requests if available
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('adminToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});


// Admin Auth APIs
export const adminLogin = async (credentials) => {
    const response = await API.post('/auth/login', credentials);
    return response.data;
};

// Admin Blog Management APIs
export const fetchAdminBlogs = async (search = '', page = '', limit = '') => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);
    const queryString = params.toString() ? `?${params.toString()}` : '';
    const response = await API.get(`/blogs/admin/all${queryString}`);
    return response.data;
};

export const createBlog = async (blogData) => {
    const response = await API.post('/blogs', blogData);
    return response.data;
};

export const updateBlog = async (id, blogData) => {
    const response = await API.put(`/blogs/${id}`, blogData);
    return response.data;
};

export const deleteBlog = async (id) => {
    const response = await API.delete(`/blogs/${id}`);
    return response.data;
};


// Admin Registration & Management APIs
export const adminRegister = async (credentials) => {
    const response = await API.post('/auth/register', credentials);
    return response.data;
};

export const fetchAdmins = async () => {
    const response = await API.get('/auth/admins');
    return response.data;
};

export const deleteAdminAccount = async (id) => {
    const response = await API.delete(`/auth/admins/${id}`);
    return response.data;
};

export const updateAdminPermissions = async (id, permissions) => {
    const response = await API.put(`/auth/admins/${id}/permissions`, { permissions });
    return response.data;
};

export const toggleAdminStatus = async (id, status) => {
    const response = await API.put(`/auth/admins/${id}/status`, { status });
    return response.data;
};

export const fetchCurrentUser = async () => {
    const response = await API.get('/auth/me');
    return response.data;
};

// SuperAdmin resets/updates password of an admin
export const updateAdminPassword = async (id, newPassword) => {
    const response = await API.put(`/auth/admins/${id}/password`, { newPassword });
    return response.data;
};

// Admin / SuperAdmin changes their own password
export const changePassword = async (currentPassword, newPassword) => {
    const response = await API.put('/auth/change-password', { currentPassword, newPassword });
    return response.data;
};


// AI Blog Generation API (Calls backend Groq integration)
export const generateAIBlog = async (topic) => {
    const response = await API.post('/blogs/ai-generate', { topic });
    return response.data;
};

// Cloudinary Image Upload API
export const uploadImage = async (file) => {
    const formData = new FormData();
    formData.append('image', file);
    const response = await API.post('/upload/image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

// Cloudinary Batch Multiple Image Upload API
export const uploadMultipleImages = async (files) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append('images', files[i]);
    }
    const response = await API.post('/upload/images', formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
    return response.data;
};

export const checkUploadStatus = async () => {
    const response = await API.get('/upload/status');
    return response.data;
};


