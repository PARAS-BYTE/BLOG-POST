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