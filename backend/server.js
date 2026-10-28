
require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Book = require('./models/Book');
const Member = require('./models/Member');
const Borrow = require('./models/Borrow');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Home route
app.get('/', (req, res) => {
  res.send('Library Management API is running!');
});

// ===============================
// DASHBOARD STATISTICS
// ===============================

app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const totalBooks = await Book.countDocuments();
    const totalMembers = await Member.countDocuments();
    const availableBooks = await Book.countDocuments({
      available: true
    });
    const issuedBooks = await Borrow.countDocuments({
      status: { $ne: 'Returned' }
    });
    const overdueBooks = await Borrow.countDocuments({
      status: { $ne: 'Returned' },
      dueDate: { $lt: new Date() }
    });

    res.json({
      totalBooks,
      totalMembers,
      issuedBooks,
      availableBooks,
      overdueBooks
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: 'Failed to fetch dashboard statistics'
    });
  }
});

// ===============================
// BOOK MANAGEMENT
// ===============================

// Get all books
app.get('/api/books', async (req, res) => {
  try {
    const books = await Book.find().sort({ createdAt: -1 });
    res.json(books);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch books' });
  }
});

// Get one book by ID
app.get('/api/books/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid book ID' });
    }

    const book = await Book.findById(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json(book);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch book' });
  }
});

// Add a book
app.post('/api/books', async (req, res) => {
  try {
    const { title, author, genre, description } = req.body;

    if (!title?.trim() || !author?.trim() || !genre?.trim()) {
      return res.status(400).json({
        message: 'Title, author, and genre are required'
      });
    }

    const book = await Book.create({
      title: title.trim(),
      author: author.trim(),
      genre: genre.trim(),
      description: description || ''
    });

    res.status(201).json({
      message: 'Book added successfully',
      book
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to add book' });
  }
});

// Update a book
app.put('/api/books/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid book ID' });
    }

    const book = await Book.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({
      message: 'Book updated successfully',
      book
    });
  } catch (error) {
    res.status(400).json({ message: 'Failed to update book' });
  }
});

// Delete a book
app.delete('/api/books/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid book ID' });
    }

    const book = await Book.findByIdAndDelete(req.params.id);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    res.json({ message: 'Book deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete book' });
  }
});

// Search books by title, author, or genre
app.get('/api/search', async (req, res) => {
  try {
    const search = req.query.q || '';

    const pattern = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
      'i'
    );

    const books = await Book.find({
      $or: [
        { title: pattern },
        { author: pattern },
        { genre: pattern }
      ]
    });

    res.json(books);
  } catch (error) {
    res.status(500).json({ message: 'Search failed' });
  }
});

// ===============================
// MEMBER MANAGEMENT
// ===============================

// Get all members
app.get('/api/members', async (req, res) => {
  try {
    const members = await Member.find().sort({ createdAt: -1 });
    res.json(members);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to fetch members' });
  }
});

// Register a member
app.post('/api/members', async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return res.status(400).json({
        message: 'Name, email, and phone are required'
      });
    }

    const member = await Member.create({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim()
    });

    res.status(201).json({
      message: 'Member registered successfully',
      member
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: 'This email is already registered'
      });
    }

    console.error(error.message);
    res.status(500).json({ message: 'Failed to register member' });
  }
});

// Delete a member
app.delete('/api/members/:id', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid member ID' });
    }

    const member = await Member.findByIdAndDelete(req.params.id);

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    res.json({ message: 'Member deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete member' });
  }
});

// ===============================
// BORROW MANAGEMENT
// ===============================

// Issue a book
app.post('/api/borrows', async (req, res) => {
  try {
    const { bookId, memberId, dueDate } = req.body;

    if (!bookId || !memberId || !dueDate) {
      return res.status(400).json({
        message: 'Book, member, and due date are required'
      });
    }

    if (
      !mongoose.isValidObjectId(bookId) ||
      !mongoose.isValidObjectId(memberId)
    ) {
      return res.status(400).json({
        message: 'Invalid book ID or member ID'
      });
    }

    const parsedDueDate = new Date(dueDate);

    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ message: 'Invalid due date' });
    }

    if (parsedDueDate <= new Date()) {
      return res.status(400).json({
        message: 'Due date must be in the future'
      });
    }

    const book = await Book.findById(bookId);
    const member = await Member.findById(memberId);

    if (!book) {
      return res.status(404).json({ message: 'Book not found' });
    }

    if (!member) {
      return res.status(404).json({ message: 'Member not found' });
    }

    if (!book.available) {
      return res.status(400).json({
        message: 'Book is already issued'
      });
    }

    const borrow = await Borrow.create({
      book: bookId,
      member: memberId,
      dueDate: parsedDueDate
    });

    book.available = false;
    await book.save();

    res.status(201).json({
      message: 'Book issued successfully',
      borrow
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to issue book' });
  }
});

// Get all borrow records
app.get('/api/borrows', async (req, res) => {
  try {
    const borrows = await Borrow.find()
      .populate('book', 'title author genre')
      .populate('member', 'name email phone')
      .sort({ createdAt: -1 });

    res.json(borrows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({
      message: 'Failed to fetch borrow records'
    });
  }
});

// Return a book
app.put('/api/borrows/:id/return', async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid borrow ID' });
    }

    const borrow = await Borrow.findById(req.params.id);

    if (!borrow) {
      return res.status(404).json({
        message: 'Borrow record not found'
      });
    }

    if (borrow.status === 'Returned') {
      return res.status(400).json({
        message: 'Book has already been returned'
      });
    }

    borrow.status = 'Returned';
    borrow.returnDate = new Date();
    await borrow.save();

    const book = await Book.findById(borrow.book);

    if (book) {
      book.available = true;
      await book.save();
    }

    res.json({
      message: 'Book returned successfully',
      borrow
    });
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ message: 'Failed to return book' });
  }
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 5000;

async function startServer() {
  if (!process.env.MONGO_URI) {
    console.error('Error: MONGO_URI is missing from your .env file');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

startServer();
