
import { useState, useEffect } from 'react';
import './App.css';

const api = 'http://localhost:5000/api';

function App() {
  const [books, setBooks] = useState([]);
  const [members, setMembers] = useState([]);
  const [borrows, setBorrows] = useState([]);
  const [search, setSearch] = useState('');

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [genre, setGenre] = useState('');
  const [description, setDescription] = useState('');

  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [dueDate, setDueDate] = useState('');

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  // Get all books
  const fetchBooks = async () => {
    const response = await fetch(`${api}/books`);

    if (!response.ok) {
      throw new Error('Failed to load books');
    }

    setBooks(await response.json());
  };

  // Get all members
  const fetchMembers = async () => {
    const response = await fetch(`${api}/members`);

    if (!response.ok) {
      throw new Error('Failed to load members');
    }

    setMembers(await response.json());
  };

  // Get borrowing records
  const fetchBorrows = async () => {
    const response = await fetch(`${api}/borrows`);

    if (!response.ok) {
      throw new Error('Failed to load borrow records');
    }

    setBorrows(await response.json());
  };

  // Load all data when the page opens
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchBooks(),
          fetchMembers(),
          fetchBorrows()
        ]);
      } catch (error) {
        setMessage(
          error.message + '. Check that your backend is running.'
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Add a new book
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${api}/books`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title,
          author,
          genre,
          description
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to add book');
      }

      setTitle('');
      setAuthor('');
      setGenre('');
      setDescription('');

      setMessage('Book added successfully!');
      await fetchBooks();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Edit a book
  const handleEdit = async (book) => {
    const newTitle = prompt('Enter book title:', book.title);

    if (newTitle === null || !newTitle.trim()) return;

    const newAuthor = prompt('Enter author:', book.author);

    if (newAuthor === null || !newAuthor.trim()) return;

    const newGenre = prompt('Enter genre:', book.genre);

    if (newGenre === null || !newGenre.trim()) return;

    const newDescription = prompt(
      'Enter description:',
      book.description || ''
    );

    if (newDescription === null) return;

    try {
      const response = await fetch(`${api}/books/${book._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          author: newAuthor.trim(),
          genre: newGenre.trim(),
          description: newDescription
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update book');
      }

      setMessage('Book updated successfully!');
      await fetchBooks();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Delete a book
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this book?')) {
      return;
    }

    try {
      const response = await fetch(`${api}/books/${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete book');
      }

      setMessage('Book deleted successfully!');
      await fetchBooks();
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Issue a book to a member
  const handleIssueBook = async (e) => {
    e.preventDefault();
    setMessage('');

    try {
      const response = await fetch(`${api}/borrows`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookId: selectedBookId,
          memberId: selectedMemberId,
          dueDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to issue book');
      }

      setMessage('Book issued successfully!');

      setSelectedBookId('');
      setSelectedMemberId('');
      setDueDate('');

      await Promise.all([
        fetchBooks(),
        fetchBorrows()
      ]);
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Return a borrowed book
  const handleReturnBook = async (borrowId) => {
    if (!window.confirm('Do you want to return this book?')) {
      return;
    }

    setMessage('');

    try {
      const response = await fetch(
        `${api}/borrows/${borrowId}/return`,
        {
          method: 'PUT'
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to return book');
      }

      setMessage('Book returned successfully!');

      await Promise.all([
        fetchBooks(),
        fetchBorrows()
      ]);
    } catch (error) {
      setMessage(error.message);
    }
  };

  // Search books by title, author, or genre
  const filteredBooks = books.filter((book) =>
    (book.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (book.author || '').toLowerCase().includes(search.toLowerCase()) ||
    (book.genre || '').toLowerCase().includes(search.toLowerCase())
  );

  // Set today's date as the minimum due date
  const now = new Date();

  const minDate =
    now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0');

  // Dashboard calculations
  const totalBooks = books.length;
  const totalMembers = members.length;

  const issuedBooks = borrows.filter(
    (borrow) => borrow.status === 'Issued'
  ).length;

  const availableBooks = books.filter(
    (book) => book.available
  ).length;

  const overdueBooks = borrows.filter((borrow) => {
    return (
      borrow.status === 'Issued' &&
      new Date(borrow.dueDate) < new Date()
    );
  }).length;

  // Recommended books
  const recommendations = [
    {
      title: 'Atomic Habits',
      author: 'James Clear',
      genre: 'Self-help',
      description:
        'A practical guide to building good habits and breaking bad ones.'
    },
    {
      title: 'The Psychology of Money',
      author: 'Morgan Housel',
      genre: 'Finance',
      description:
        'Learn how people think about money, saving, and investing.'
    },
    {
      title: 'Wings of Fire',
      author: 'A. P. J. Abdul Kalam',
      genre: 'Autobiography',
      description:
        'An inspiring autobiography about dreams, hard work, and success.'
    },
    {
      title: 'The Power of Now',
      author: 'Eckhart Tolle',
      genre: 'Spirituality',
      description:
        'A book about mindfulness and living in the present moment.'
    }
  ];

  return (
    <div className="app">

      {/* Navigation */}
      <nav className="navbar">
        <h2>📚 BookNest</h2>

        <div>
          <a href="#home">Home</a>
          <a href="#dashboard">Dashboard</a>
          <a href="#add-book">Add Book</a>
          <a href="#books">Books</a>
          <a href="#members">Members</a>
          <a href="#borrow">Issue Book</a>
          <a href="#borrow-records">Borrow Records</a>
          <a href="#recommendations">Recommendations</a>
        </div>
      </nav>

      {/* Home */}
      <section className="hero" id="home">
        <h1>Discover Your Next Favorite Book</h1>

        <p>
          Explore books, learn something new, and find your next great read.
        </p>

        <input
          type="text"
          placeholder="Search by title, author, or genre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      {/* Library Dashboard */}
      <section className="dashboard" id="dashboard">
        <h2>📊 Library Dashboard</h2>

        <div className="dashboard-grid">
          <div className="dashboard-card books-total">
            <div className="dashboard-icon">📚</div>
            <h3>{totalBooks}</h3>
            <p>Total Books</p>
          </div>

          <div className="dashboard-card members-total">
            <div className="dashboard-icon">👥</div>
            <h3>{totalMembers}</h3>
            <p>Total Members</p>
          </div>

          <div className="dashboard-card issued-total">
            <div className="dashboard-icon">📖</div>
            <h3>{issuedBooks}</h3>
            <p>Issued Books</p>
          </div>

          <div className="dashboard-card available-total">
            <div className="dashboard-icon">✅</div>
            <h3>{availableBooks}</h3>
            <p>Available Books</p>
          </div>

          <div className="dashboard-card overdue-total">
            <div className="dashboard-icon">⏰</div>
            <h3>{overdueBooks}</h3>
            <p>Overdue Books</p>
          </div>
        </div>
      </section>

      {/* Add Book */}
      <section className="add-book" id="add-book">
        <h2>Add a New Book</h2>

        <form onSubmit={handleSubmit}>
          <input
            placeholder="Book title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <input
            placeholder="Author name"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
          />

          <input
            placeholder="Genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            required
          />

          <textarea
            placeholder="Book description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <button type="submit">Add Book</button>
        </form>
      </section>

      {/* Books */}
      <section className="books-section" id="books">
        <h2>Explore Our Books</h2>

        {loading ? (
          <p>Loading books...</p>
        ) : (
          <div className="book-container">
            {filteredBooks.length > 0 ? (
              filteredBooks.map((book) => (
                <div className="book-card" key={book._id}>
                  <div className="book-icon">📖</div>

                  <h3>{book.title}</h3>
                  <p>Author: {book.author}</p>

                  <span>{book.genre}</span>

                  <p>
                    {book.description || 'No description available.'}
                  </p>

                  <p>
                    {book.available ? 'Available' : 'Not available'}
                  </p>

                  <button onClick={() => handleEdit(book)}>
                    Edit Book
                  </button>

                  <button onClick={() => handleDelete(book._id)}>
                    Delete Book
                  </button>
                </div>
              ))
            ) : (
              <p>No books found.</p>
            )}
          </div>
        )}
      </section>

      {/* Library Members */}
      <section className="add-book" id="members">
        <h2>Library Members</h2>

        {members.length > 0 ? (
          <div className="members-grid">
            {members.map((member) => (
              <div className="member-card" key={member._id}>
                <div className="member-icon">👤</div>

                <h3>{member.name}</h3>

                <p>
                  <strong>Email:</strong> {member.email}
                </p>

                <p>
                  <strong>Phone:</strong> {member.phone}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p>No members found. Add members using POST /api/members.</p>
        )}
      </section>

      {/* Issue a Book */}
      <section className="add-book" id="borrow">
        <h2>📚 Issue a Book</h2>

        <form onSubmit={handleIssueBook}>
          <label htmlFor="book-select">Select Book</label>

          <select
            id="book-select"
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
            required
          >
            <option value="">-- Choose a book --</option>

            {books
              .filter((book) => book.available)
              .map((book) => (
                <option key={book._id} value={book._id}>
                  {book.title} - {book.author}
                </option>
              ))}
          </select>

          <label htmlFor="member-select">Select Member</label>

          <select
            id="member-select"
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
            required
          >
            <option value="">-- Choose a member --</option>

            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name} - {member.email}
              </option>
            ))}
          </select>

          <label htmlFor="due-date">Due Date</label>

          <input
            id="due-date"
            type="date"
            min={minDate}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />

          <button
            type="submit"
            disabled={
              books.filter((book) => book.available).length === 0 ||
              members.length === 0
            }
          >
            Issue Book
          </button>
        </form>
      </section>

      {/* Borrow Records */}
      <section className="books-section" id="borrow-records">
        <h2>📋 Borrow Records</h2>

        {borrows.length > 0 ? (
          <div className="book-container">
            {borrows.map((borrow) => (
              <div className="book-card" key={borrow._id}>
                <h3>
                  {borrow.book?.title || 'Book unavailable'}
                </h3>

                <p>
                  <strong>Author:</strong>{' '}
                  {borrow.book?.author || 'Unknown'}
                </p>

                <p>
                  <strong>Member:</strong>{' '}
                  {borrow.member?.name || 'Unknown'}
                </p>

                <p>
                  <strong>Email:</strong>{' '}
                  {borrow.member?.email || 'Unknown'}
                </p>

                <p>
                  <strong>Issue Date:</strong>{' '}
                  {borrow.issueDate
                    ? new Date(borrow.issueDate).toLocaleDateString()
                    : 'N/A'}
                </p>

                <p>
                  <strong>Due Date:</strong>{' '}
                  {borrow.dueDate
                    ? new Date(borrow.dueDate).toLocaleDateString()
                    : 'N/A'}
                </p>

                <p>
                  <strong>Status:</strong> {borrow.status}
                </p>

                {borrow.status === 'Issued' && (
                  <button
                    onClick={() => handleReturnBook(borrow._id)}
                  >
                    Return Book
                  </button>
                )}

                {borrow.status === 'Returned' && (
                  <p>
                    <strong>Returned on:</strong>{' '}
                    {borrow.returnDate
                      ? new Date(borrow.returnDate).toLocaleDateString()
                      : 'N/A'}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p>No borrowing records found yet.</p>
        )}
      </section>

      {/* Book Recommendations */}
      <section
        id="recommendations"
        className="recommendations"
      >
        <h2>📚 Book Recommendations</h2>

        <p>Discover some books you may enjoy reading.</p>

        <div className="book-container">
          {recommendations.map((book) => (
            <div className="book-card" key={book.title}>
              <div className="book-icon">📖</div>

              <h3>{book.title}</h3>

              <p>Author: {book.author}</p>

              <p>{book.description}</p>

              <span>{book.genre}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Status Message */}
      {message && (
        <p className="message">{message}</p>
      )}

      {/* Footer */}
      <footer>
        <p>© 2026 BookNest | Library Management System</p>
      </footer>

    </div>
  );
}

export default App;
