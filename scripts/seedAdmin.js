import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import User from '../src/models/User.js';

const seedAdmin = async () => {
  try {
    await mongoose.connect(env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const adminEmail = 'admin@akatsuki.dev';
    const existing = await User.findOne({ email: adminEmail });

    if (existing) {
      console.log('⚠️  Admin user already exists:', adminEmail);
    } else {
      const admin = await User.create({
        name: 'Akatsuki Admin',
        email: adminEmail,
        password: 'admin123',
        role: 'admin',
      });
      console.log('✅ Admin user created successfully');
      console.log(`   Email:    ${admin.email}`);
      console.log(`   Password: admin123`);
      console.log(`   Role:     ${admin.role}`);
    }
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
};

seedAdmin();
