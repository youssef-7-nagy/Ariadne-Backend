const mongoose = require('mongoose');
const Category = require('../models/Category');
const Project = require('../models/Project');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').resolve(__dirname, '../.env') });

const seedData = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);

    // Clear existing data
    await Category.deleteMany({});
    await Project.deleteMany({});

    // Create Categories
    const categories = await Category.insertMany([
      { name: 'Short Films', slug: 'short-films', description: 'Narrative-driven artistic short films.', order: 1 },
      { name: 'Documentaries', slug: 'documentaries', description: 'Long-form cinematic narratives uncovering the truth.', order: 2 },
      { name: 'Commercials', slug: 'commercials', description: 'High-impact advertising campaigns for premium brands.', order: 3 },
      { name: 'Events', slug: 'events', description: 'Capturing conferences, ceremonies, and luxury events.', order: 4 },
      { name: 'Podcasts', slug: 'podcasts', description: 'Professional podcast recording and production.', order: 5 },
      { name: 'Live Streaming', slug: 'live-streaming', description: 'Multi-camera professional streaming solutions.', order: 6 },
      { name: 'Corporate Videos', slug: 'corporate-videos', description: 'Business presentations, company profiles, and branding.', order: 7 },
      { name: 'Music Videos', slug: 'music-videos', description: 'Creative visual storytelling for artists and bands.', order: 8 },
      { name: 'Photography', slug: 'photography', description: 'Professional photography for brands and individuals.', order: 9 },
      { name: 'Behind The Scenes', slug: 'behind-the-scenes', description: 'Exclusive production process coverage.', order: 10 },
    ]);

    // Create Projects
    await Project.insertMany([
      {
        title: 'The Artisan\'s Journey',
        slug: 'the-artisans-journey',
        category: categories.find(c => c.slug === 'documentaries')._id,
        description: 'A 20-minute documentary exploring the dying art of traditional glassblowing in Cairo.',
        date: new Date('2025-11-15'),
        clientName: 'National Heritage Trust',
        tags: ['Cultural', 'Cinematic', '4K'],
        media: [
          { type: 'image', url: 'https://images.unsplash.com/photo-1604928141064-207cea6f5722?q=80&w=800&auto=format&fit=crop', isFeatured: true }
        ]
      },
      {
        title: 'Midnight Run',
        slug: 'midnight-run',
        category: categories.find(c => c.slug === 'commercials')._id,
        description: 'Launch campaign for the new Velocity V8 sports car.',
        date: new Date('2026-01-20'),
        clientName: 'Velocity Motors',
        tags: ['Automotive', 'High-Speed', 'Studio'],
        media: [
          { type: 'image', url: 'https://images.unsplash.com/photo-1551135049-8a33b5883817?q=80&w=1000&auto=format&fit=crop', isFeatured: true }
        ]
      }
    ]);

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedData();
