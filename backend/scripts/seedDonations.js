const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { faker } = require('@faker-js/faker');
const Temple = require('../models/Temple');
const Donation = require('../models/Donation');

dotenv.config();

const seedDonations = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    const donationNames = ['Goyu Samrakshana', 'Bhojan Schema', 'Temple Renovation', 'Repair Donation', 'General Donation', 'Corpus Fund'];
    
    // 1. Get all Temple IDs
    const temples = await Temple.find({}, '_id');
    const templeIds = temples.map(t => t._id.toString());

    if (templeIds.length === 0) {
      console.log("No temples found. Seed temples first!");
      process.exit();
    }

    let seedData = [];

    for (const templeId of templeIds) {
      // 2. Check existing donations for this temple to avoid duplicates
      const existingDonations = await Donation.find({ temple_id: templeId }, 'name');
      const existingNames = existingDonations.map(d => d.name);

      for (const name of donationNames) {
        if (existingNames.includes(name)) continue;

        const lat = faker.location.latitude({ min: 8, max: 37 });
        const lng = faker.location.longitude({ min: 68, max: 97 });

        seedData.push({
          temple_id: templeId,
          name: name,
          short_description: faker.lorem.paragraph(),
          long_description: faker.lorem.paragraphs(2),
          mobile_number: faker.string.numeric('9#########'),
          image: `https://picsum.photos/seed/${faker.string.uuid()}/800/600`,
          address: {
            line1: faker.location.streetAddress(),
            line2: faker.location.secondaryAddress(),
            landmark: faker.lorem.word(),
            city: faker.location.city(),
            state: faker.location.state(),
            pincode: faker.string.numeric('6######'),
            country: "India"
          },
          location: {
            latitude: lat.toString(),
            longitude: lng.toString(),
            url: `https://www.google.com/maps?q=${lat},${lng}`
          },
          sequence: faker.number.int({ min: 1, max: 100 }),
          status: 1
        });
      }
    }

    if (seedData.length > 0) {
      await Donation.insertMany(seedData);
      console.log(`Successfully seeded ${seedData.length} donations!`);
    } else {
      console.log("No new donations to seed.");
    }

    mongoose.connection.close();
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  }
};

seedDonations();