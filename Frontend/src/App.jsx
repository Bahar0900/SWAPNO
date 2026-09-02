import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { auth, loginWithGoogle, logout, onAuthStateChanged } from './firebase';
import CheckoutForm from './CheckoutForm';
import './App.css';

// From Stripe Dashboard -> Developers -> API keys -> Publishable key (test mode)
const stripePromise = loadStripe('pk_test_51UB9DlAzOdgL4dLEtv9oXyDBX9s0HNu3SZGy0SQXWiavAetbr1tF3zTCKlY3sPtgevLXmVDw7jJ2Z019v28mzBcj00FRnWosWn');

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);

  // UI & Filtering States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);

  // Auth Session State (Firebase Google Sign-In)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null); // SQLite CUSTOMERS row
  const [idToken, setIdToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Checkout panel visibility
  const [showCheckout, setShowCheckout] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  // Keeps the session alive across refreshes: Firebase restores the signed-in
  // user, we re-fetch a fresh idToken and re-sync the SQLite profile.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const freshToken = await firebaseUser.getIdToken();
        await syncBackendProfile(freshToken);
      } else {
        setIsLoggedIn(false);
        setUserData(null);
        setIdToken(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchProducts = () => {
    axios.get('https://swapno-api.onrender.com/api/products')
      .then(res => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load catalog:", err);
        setLoading(false);
      });
  };

  // Sends the Firebase ID token to the backend, which verifies it and
  // finds/creates the matching CUSTOMERS row in SQLite.
  const syncBackendProfile = async (token) => {
    try {
      const res = await axios.post(
        'http://localhost:5000/api/auth/firebase-login',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUserData(res.data.user);
      setIdToken(token);
      setIsLoggedIn(true);
    } catch (err) {
      console.error("Backend profile sync failed:", err);
      alert(err.response?.data?.error || "Could not sync your profile with the server.");
    }
  };

  const handleGoogleLogin = async () => {
    setAuthLoading(true);
    try {
      const { idToken: freshToken } = await loginWithGoogle();
      await syncBackendProfile(freshToken);
    } catch (err) {
      alert(err.message || "Google sign-in failed.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsLoggedIn(false);
    setUserData(null);
    setIdToken(null);
  };

  const handleCheckout = () => {
    if (!isLoggedIn) return alert("অর্ডার করতে প্রথমে লগইন করুন! (Please sign in first to place an order)");
    if (cart.length === 0) return alert("Your cart is empty!");
    setShowCheckout(true);
  };

  const handleOrderSuccess = (orderResult) => {
    alert(`🎉 Order Placed Successfully!\nOrder ID: ${orderResult.order_id}\nTotal Charged: $${orderResult.total_amount}`);
    setCart([]);
    setShowCheckout(false);
    fetchProducts();
  };

  const addToCart = (product) => {
    setCart(prev => {
      const match = prev.find(i => i.product_id === product.product_id);
      if (match) {
        return prev.map(i => i.product_id === product.product_id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const categoriesList = ['All', 'Milk', 'Ghee', 'Rice', 'Salt'];

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.product_name.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      alert(`Image "${e.target.files[0].name}" selected successfully!`);
    }
  };

  if (loading) return <div className="p-10 text-center font-semibold text-gray-500">Loading Shwapno Storefront Engine...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f7] text-gray-800">

      <header className="bg-[#e21b22] text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">

          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}>
            <span className="text-3xl font-black tracking-tight text-white">shwapno</span>
            <span className="w-3 h-3 rounded-full bg-[#fce303]"></span>
          </div>

          <div className="flex-1 max-w-2xl w-full flex items-center gap-3">
            <div className="flex flex-col items-center justify-center min-w-[110px]">
              <button
                onClick={() => setIsSemanticSearch(!isSemanticSearch)}
                className={`w-16 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 relative ${
                  isSemanticSearch ? 'bg-green-500 justify-start' : 'bg-gray-400 justify-end'
                }`}
              >
                {isSemanticSearch ? (
                  <span className="absolute right-2 text-[10px] font-bold text-white select-none">ON</span>
                ) : (
                  <span className="absolute left-2 text-[10px] font-bold text-white select-none">OFF</span>
                )}
                <div className="bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300"></div>
              </button>
              <span className="text-[10px] mt-0.5 font-medium tracking-wide text-white/90 whitespace-nowrap">
                {isSemanticSearch ? "Semantic Search On" : "Normal Mode"}
              </span>
            </div>

            <label className="flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors p-2 rounded-md cursor-pointer h-9 w-9 shrink-0" title="Search by image">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
              <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </label>

            <div className="flex flex-1">
              <input
                type="text"
                placeholder={isSemanticSearch ? "Describe what you need in detail..." : "Search for products (e.g. milk, rice)..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 text-gray-900 rounded-l-md border-none focus:outline-none text-sm h-9"
              />
              <button className="bg-[#fce303] text-gray-900 px-6 font-bold rounded-r-md hover:bg-yellow-400 text-sm transition-colors h-9">
                Search
              </button>
            </div>
          </div>

          {/* 🔐 Auth Panel — Google Sign-In via Firebase */}
          <div className="flex items-center gap-4 text-sm">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="font-medium text-white bg-black/20 px-3 py-1 rounded-full">
                  Hello, <b>{userData?.name}</b>
                </span>
                <button onClick={handleLogout} className="text-xs underline text-yellow-200 hover:text-white">Logout</button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                disabled={authLoading}
                className="flex items-center gap-2 bg-white text-gray-800 font-bold px-3 py-1.5 rounded-md text-xs hover:bg-gray-100 disabled:opacity-50"
              >
                <svg width="14" height="14" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2C29.3 35.4 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-0.8 2.3-2.3 4.3-4.2 5.7l6.2 5.2C40.5 36.3 44 30.8 44 24c0-1.3-.1-2.7-.4-3.5z"/></svg>
                {authLoading ? "Signing in..." : "Sign in with Google"}
              </button>
            )}
          </div>

        </div>
      </header>

      <div className="max-w-[1400px] mx-auto w-full px-4 py-6 flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">

        <aside className="md:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 h-fit">
          <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider pb-2 border-b border-gray-100 mb-3 text-[#e21b22]">
            Categories
          </h3>
          <ul className="space-y-1 text-sm font-medium text-gray-700">
            {categoriesList.map(cat => (
              <li
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`p-2.5 rounded-md cursor-pointer transition-all flex justify-between items-center ${
                  selectedCategory === cat
                    ? 'bg-red-50 text-[#e21b22] font-bold border-l-4 border-[#e21b22]'
                    : 'hover:bg-gray-50 hover:text-[#e21b22]'
                }`}
              >
                <span>{cat === 'All' ? 'All Groceries' : cat}</span>
                <span className="text-[10px] text-gray-300">▶</span>
              </li>
            ))}
          </ul>
        </aside>

        <main className="md:col-span-2">
          <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">
              Showing: <span className="text-[#e21b22]">{selectedCategory === 'All' ? 'All Products' : selectedCategory}</span>
            </h2>
            <span className="text-xs text-gray-400 font-mono">Found: {filteredProducts.length} items</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map(product => (
              <div key={product.product_id} className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="w-full h-32 bg-gray-50 rounded mb-3 flex items-center justify-center border border-gray-100">
                    <span className="text-gray-300 text-2xl font-bold">🛒</span>
                  </div>
                  <h4 className="font-bold text-gray-800 text-sm h-10 line-clamp-2">{product.product_name}</h4>
                  <p className="text-xs text-gray-400 mt-1">Stock Availability: {product.stock_quantity} pcs</p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-lg font-black text-gray-900">৳{product.current_price}</span>
                  <button
                    onClick={() => addToCart(product)}
                    disabled={product.stock_quantity === 0}
                    className="bg-[#e21b22] hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Bag'}
                  </button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-2 bg-white p-8 text-center text-gray-400 text-sm rounded-lg border border-gray-200">
                No items match your criteria. Try another menu block selection.
              </div>
            )}
          </div>
        </main>

        <aside className="md:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 h-fit sticky top-20">
          <h3 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-3 mb-3 flex justify-between items-center">
            <span>My Shopping Bag</span>
            <span className="bg-[#e21b22] text-white text-xs px-2 py-0.5 rounded-full font-mono">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </h3>

          {cart.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">Your bag is empty. Add items to checkout.</div>
          ) : showCheckout ? (
            <Elements stripe={stripePromise}>
              <CheckoutForm
                cart={cart}
                idToken={idToken}
                onSuccess={handleOrderSuccess}
                onCancel={() => setShowCheckout(false)}
              />
            </Elements>
          ) : (
            <>
              <div className="space-y-3 max-h-60 overflow-y-auto mb-4 border-b border-gray-100 pb-3">
                {cart.map(item => (
                  <div key={item.product_id} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded border border-gray-100 group">
                    <div className="flex-1 min-w-0 pr-2">
                      <p className="font-semibold text-gray-800 line-clamp-1">{item.product_name}</p>
                      <p className="text-gray-400 text-[11px]">৳{item.current_price} × {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 whitespace-nowrap">৳{item.current_price * item.quantity}</span>
                      <button
                        onClick={() => removeFromCart(item.product_id)}
                        className="text-gray-400 hover:text-red-600 font-bold px-1 text-sm transition-colors"
                        title="Remove from bag"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-1 mb-4 space-y-1.5 text-xs font-medium">
                <div className="flex justify-between text-gray-500">
                  <span>Bag Subtotal</span>
                  <span>৳{cart.reduce((s, i) => s + (i.current_price * i.quantity), 0)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 pt-1">
                  <span>Total Payable</span>
                  <span className="text-[#e21b22]">৳{cart.reduce((s, i) => s + (i.current_price * i.quantity), 0)}</span>
                </div>
                <p className="text-[10px] text-gray-400 pt-1">Charged in USD on Stripe test mode — prices shown in ৳ for now.</p>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-[#fce303] hover:bg-yellow-400 text-gray-900 font-extrabold text-xs py-3 rounded text-center tracking-wider transition-all shadow-sm active:scale-[0.99]"
              >
                PLACE ORDER
              </button>
            </>
          )}
        </aside>

      </div>
    </div>
  );
}

export default App;
