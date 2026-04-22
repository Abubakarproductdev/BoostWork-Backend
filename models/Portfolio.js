const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, default: '' },
    link: { type: String, default: '' },
    technologies: { type: [String], default: [] }
});

const linkSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, default: '' }
});

const profileSchema = new mongoose.Schema({
    fullName: { type: String, default: '' },
    title: { type: String, default: '' },
    bio: { type: String, default: '' }
});

const portfolioSchema = new mongoose.Schema({
    profile: { type: profileSchema, default: {} },
    projects: { type: [projectSchema], default: [] },
    links: { type: [linkSchema], default: [] }
}, {
    timestamps: true
});

module.exports = mongoose.model('Portfolio', portfolioSchema);
