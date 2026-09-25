const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Admin = require('./models/Admin');
const Blog = require('./models/Blog');

dotenv.config();

const seedData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB connected for seeding...');

        // 1. Seed Admin
        const adminEmail = 'admin@utsanova.com';
        const existingAdmin = await Admin.findOne({ email: adminEmail });

        if (!existingAdmin) {
            const admin = new Admin({
                email: adminEmail,
                password: 'AdminSecurePassword123'
            });
            await admin.save();
            console.log('Default Admin Created Successfully!');
        } else {
            console.log('Default admin already exists.');
        }

        // 2. Seed Sample Blogs
        const blogCount = await Blog.countDocuments();
        if (blogCount === 0) {
            await Blog.insertMany([
                {
                    "title": "Mastering Full-Stack Development with the MERN Stack",
                    "content": "The MERN stack (MongoDB, Express.js, React.js, and Node.js) has become the gold standard for modern web development. By using JavaScript across the entire stack, developers can streamline communication between the client and server, share code logic, and build fast, scalable applications. In this guide, we walk through setting up a robust API architecture and connecting it with a responsive React frontend.",
                    "tags": ["MERN", "WebDev", "JavaScript"],
                    "conclusion": "Embracing the MERN stack empowers developers to build end-to-end features efficiently and maintain codebases with ease.",
                    "status": "Published"
                },
                {
                    "title": "Why Tailwind CSS is Dominating Frontend Design",
                    "content": "Traditional CSS frameworks often lead to bloated stylesheets and repetitive naming conventions. Tailwind CSS introduces a utility-first approach that allows developers to style components directly inside their markup. This drastically reduces context-switching and speeds up the development lifecycle while maintaining pixel-perfect consistency across devices.",
                    "tags": ["UI/UX", "Tailwind", "Frontend"],
                    "conclusion": "Utility-first CSS frameworks like Tailwind provide unparalleled flexibility for modern web applications.",
                    "status": "Published"
                },
                {
                    "title": "Getting Started with Python for Artificial Intelligence",
                    "content": "Python remains the undisputed language of choice for AI and machine learning engineering. Its clean syntax and rich ecosystem of libraries like NumPy, Pandas, and Scikit-Learn make data preprocessing and model training straightforward. Whether you are building predictive models or deep learning neural networks, Python provides the right foundation.",
                    "tags": ["Python", "AI", "MachineLearning"],
                    "conclusion": "Learning Python is an essential first step for any developer looking to break into the artificial intelligence space.",
                    "status": "Published"
                },
                {
                    "title": "Containerizing Node.js Applications with Docker",
                    "content": "Environment discrepancies between local development machines and production servers often cause unexpected bugs. Docker solves the 'it works on my machine' problem by packaging your Node.js application, database dependencies, and runtime environment into lightweight, isolated containers that run reliably anywhere.",
                    "tags": ["DevOps", "Docker", "Backend"],
                    "conclusion": "Docker containerization is a crucial skill for modern deployment pipelines and microservices architecture.",
                    "status": "Published"
                },
                {
                    "title": "Optimizing React Application Performance",
                    "content": "As React applications grow larger, unnecessary re-renders can degrade user experience. Techniques such as React.memo, useMemo, useCallback, and code-splitting with React.lazy help keep your web applications blazing fast. Monitoring bundle sizes and component render trees ensures optimal runtime efficiency.",
                    "tags": ["React", "WebDev", "Performance"],
                    "conclusion": "Proactive performance optimization ensures your React apps scale gracefully under heavy user traffic.",
                    "status": "Published"
                },
                {
                    "title": "Securing REST APIs with JSON Web Tokens (JWT)",
                    "content": "Authentication is a cornerstone of web security. JSON Web Tokens (JWT) provide a stateless, secure mechanism for transmitting user credentials and session information between parties. Implementing secure password hashing with bcrypt alongside JWT ensures your backend endpoints remain protected against unauthorized access.",
                    "tags": ["Node.js", "Security", "Backend"],
                    "conclusion": "Always prioritize robust token validation and secure cookie management to safeguard user data.",
                    "status": "Published"
                },
                {
                    "title": "Building Smart AI Agents with LangChain and LLMs",
                    "content": "Large Language Models (LLMs) are powerful, but connecting them to real-world data sources requires orchestration frameworks. LangChain and LangGraph allow developers to build autonomous AI agents capable of reasoning, calling custom APIs, executing tool loops, and querying vector databases dynamically.",
                    "tags": ["AI", "LangChain", "LLM"],
                    "conclusion": "Agentic workflows represent the next frontier in building intelligent, context-aware software solutions.",
                    "status": "Published"
                },
                {
                    "title": "Responsive Design Principles for Mobile-First Web Apps",
                    "content": "With mobile traffic accounting for a massive share of global web browsing, building desktop-first websites is no longer viable. Mobile-first design forces developers to focus on core functionality, touch-friendly interfaces, fluid grids, and fast asset loading before scaling up to tablet and desktop viewports.",
                    "tags": ["UI/UX", "Design", "Mobile"],
                    "conclusion": "A mobile-first mindset guarantees an inclusive and seamless experience across all user devices.",
                    "status": "Published"
                },
                {
                    "title": "Advanced MongoDB Indexing and Query Optimization",
                    "content": "As your database collections grow from thousands to millions of documents, unindexed queries can cause severe performance bottlenecks. Understanding single-field, compound, and text indexes in MongoDB allows you to speed up read operations and optimize complex search filters significantly.",
                    "tags": ["MongoDB", "Database", "Backend"],
                    "conclusion": "Proper database indexing is vital for maintaining low latency as your application scales.",
                    "status": "Published"
                },
                {
                    "title": "Git and GitHub Best Practices for Collaborative Teams",
                    "content": "Version control is essential when multiple developers collaborate on a single repository. Adopting clean branching strategies like Git Flow, writing descriptive commit messages, opening detailed pull requests, and automating code reviews via CI/CD pipelines ensures code quality remains high.",
                    "tags": ["DevOps", "Git", "Productivity"],
                    "conclusion": "Disciplined version control workflows prevent merge conflicts and foster smooth engineering collaboration.",
                    "status": "Published"
                }
            ]);
            console.log('Sample Published Blogs Created Successfully!');
        }

        process.exit();
    } catch (error) {
        console.error('Error seeding data:', error);
        process.exit(1);
    }
};

seedData();