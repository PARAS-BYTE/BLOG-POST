import axios from 'axios';

const API = axios.create({
    baseURL: 'http://localhost:5000/api'
});

// Public Blog APIs
export const fetchPublishedBlogs = async (search = '', tag = '') => {
    const response = await API.get(`/blogs?search=${search}&tag=${tag}`);
    console.log('Fetching blogs')
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
export const fetchAdminBlogs = async () => {
    const response = await API.get('/blogs/admin/all');
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


// Add this inside frontend/src/services/api.js
export const adminRegister = async (credentials) => {
    const response = await API.post('/auth/register', credentials);
    return response.data;
};