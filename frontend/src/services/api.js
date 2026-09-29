import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api'
});

// Public Blog APIs
export const fetchPublishedBlogs = async (search = '', tag = '', page = 1, limit = 6) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (tag) params.append('tag', tag);
    if (page) params.append('page', page);
    if (limit) params.append('limit', limit);

    const response = await API.get(`/blogs?${params.toString()}`);
    return response.data;
};

export const fetchBlogById = async (id) => {
    const response = await API.get(`/blogs/${id}`);
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


// Admin Registration API
export const adminRegister = async (credentials) => {
    const response = await API.post('/auth/register', credentials);
    return response.data;
};

// AI Blog Generation API (Calls backend Groq integration)
export const generateAIBlog = async (topic) => {
    const response = await API.post('/blogs/ai-generate', { topic });
    return response.data;
};