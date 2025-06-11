import mongoose from 'mongoose';
import { Role } from '../app/models/role.model';
import { Auth } from '../app/models/auth.model';
import { User } from '../app/models/user.model';
import { Post } from '../app/models/post.model';
import { Comment } from '../app/models/comment.model';
import { RoleEnum } from '../app/enums/role.enum';
import { faker } from '@faker-js/faker';
import dotenv from "dotenv";


dotenv.config();


// Connect to MongoDB
mongoose.connect(`mongodb+srv://ankurvasta123:${process.env.PASSWORD}@cluster0.1f6xg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Helper function to get random role
const getRandomRole = () => {
  const roles = [RoleEnum.user.enum, RoleEnum.moderator.enum, RoleEnum.admin.enum];
  return roles[Math.floor(Math.random() * roles.length)];
};

// Create roles
const createRoles = async () => {
  await Role.deleteMany({});
  const roles = [
    { name: 'User', enum: RoleEnum.user.enum },
    { name: 'Moderator', enum: RoleEnum.moderator.enum },
    { name: 'Admin', enum: RoleEnum.admin.enum }
  ];
  await Role.insertMany(roles);
  console.log('Roles created');
};

// Create users
const createUsers = async (count: number) => {
  // Delete only non-admin users
  await Auth.deleteMany({ roles: { $nin: [RoleEnum.admin.enum] } });
  await User.deleteMany({ _id: { $in: await Auth.find({ roles: { $nin: [RoleEnum.admin.enum] } }).select('_id') } });

  const users = [];
  for (let i = 0; i < count; i++) {
    const auth = new Auth({
      username: faker.internet.userName(),
      email: faker.internet.email(),
      password: faker.internet.password(),
      roles: [RoleEnum.user.enum]
    });
    await auth.save();

    const user = new User({
      _id: auth._id,
      name: faker.person.fullName(),
      bio: faker.lorem.paragraph(),
      skills: faker.helpers.arrayElements(['JavaScript', 'Python', 'Java', 'React', 'Node.js', 'MongoDB'], 3).join(', '),
      social: {
        github: faker.internet.url(),
        linkedin: faker.internet.url(),
        twitter: faker.internet.url(),
        website: faker.internet.url()
      },
    });
    await user.save();
    users.push(user);
  }
  console.log(`${count} users created`);
  return users;
};

// Create posts
const createPosts = async (users: any[], count: number) => {
  await Post.deleteMany({});

  const posts = [];
  for (let i = 0; i < count; i++) {
    const post = new Post({
      userId: users[Math.floor(Math.random() * users.length)]._id,
      content: faker.lorem.paragraphs(5),
      likes: []
    });
    await post.save();
    posts.push(post);
  }
  console.log(`${count} posts created`);
  return posts;
};

// Create comments
const createComments = async (users: any[], posts: any[], count: number) => {
  await Comment.deleteMany({});

  for (let i = 0; i < count; i++) {
    const comment = new Comment({
      postId: posts[Math.floor(Math.random() * posts.length)]._id,
      userId: users[Math.floor(Math.random() * users.length)]._id,
      content: faker.lorem.paragraph()
    });
    await comment.save();
  }
  console.log(`${count} comments created`);
};

// Add likes to posts
const addLikes = async (users: any[], posts: any[]) => {
  for (const post of posts) {
    const likeCount = Math.floor(Math.random() * 10); // Random number of likes (0-9)
    const randomUsers = faker.helpers.arrayElements(users, likeCount);
    post.likes = randomUsers.map(user => user._id);
    await post.save();
  }
  console.log('Likes added to posts');
};

// Main seed function
const seed = async () => {
  try {
    await createRoles();
    const users = await createUsers(20); // Create 20 users
    const posts = await createPosts(users, 50); // Create 50 posts
    await createComments(users, posts, 100); // Create 100 comments
    await addLikes(users, posts);
    console.log('Seed completed successfully');
  } catch (error) {
    console.error('Seed failed:', error);
  } finally {
    mongoose.disconnect();
  }
};

// Run the seed
seed(); 