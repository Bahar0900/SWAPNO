import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState([]);
  
  // UI & Filtering States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // New States for Search Mode & Image Upload
  const [isSemanticSearch, setIsSemanticSearch] = useState(false);
  
  // Auth Form States
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [firstNameInput, setFirstNameInput] = useState('');
  const [lastNameInput, setLastNameInput] = useState('');
  
  // User Session State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);

  // Load products from backend on mount
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = () => {
    axios.get('http://localhost:5000/api/products')
      .then(res => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load catalog:", err);
        setLoading(false);
      });
  };

  // Handles Customer Authentication Login
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!emailInput) return;
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email: emailInput });
      setUserData(res.data.user);
      setIsLoggedIn(true);
      setEmailInput('');
      alert(`স্বাগতম, ${res.data.user.name || res.data.user.first_name || 'গ্রাহক'}! Login Successful.`);
    } catch (err) {
      alert(err.response?.data?.error || "Login Failed. Email not found.");
    }
  };

  // Real Registration Flow connecting to the updated Backend Endpoint
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!emailInput || !firstNameInput) return alert("Please fill required fields!");
    
    try {
      const res = await axios.post('http://localhost:5000/api/auth/register', {
        email: emailInput,
        first_name: firstNameInput,
        last_name: lastNameInput
      });
      
      setUserData(res.data.user);
      setIsLoggedIn(true);
      setIsRegisterMode(false);
      setEmailInput('');
      setFirstNameInput('');
      setLastNameInput('');
      alert("Registration Successful! Saved to SQLite database.");
    } catch (err) {
      alert(err.response?.data?.error || "Registration Failed");
    }
  };

  // Places the order to the backend /api/orders
  const handleCheckout = async () => {
    if (!isLoggedIn) return alert("অর্ডার করতে প্রথমে লগইন করুন! (Please login first to place an order)");
    if (cart.length === 0) return alert("Your cart is empty!");

    const payload = {
      customer_id: userData.customer_id,
      items: cart.map(item => ({ 
        product_id: item.product_id, 
        quantity: item.quantity 
      }))
    };

    try {
      const res = await axios.post('http://localhost:5000/api/orders', payload);
      alert(`🎉 Order Placed Successfully!\nOrder ID: ${res.data.order_id}\nTotal Charged: ৳${res.data.total_amount}`);
      setCart([]); // Reset Cart UI state
      fetchProducts(); // Refresh stock metrics from backend DB
    } catch (err) {
      alert("Checkout failed: " + (err.response?.data?.error || err.message));
    }
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

  // Completely deletes a item line from the Cart Panel
  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  // Static list of categories mapping item text criteria keywords
  const categoriesList = ['All', 'Milk', 'Ghee', 'Rice', 'Salt'];

  // Client-side filtering matrix based on Search and Selected Category Menu
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.product_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.product_name.toLowerCase().includes(selectedCategory.toLowerCase());
    return matchesSearch && matchesCategory;
  });

  // Handle image attachment dummy action
  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      alert(`Image "${e.target.files[0].name}" selected successfully!`);
    }
  };

  if (loading) return <div className="p-10 text-center font-semibold text-gray-500">Loading Shwapno Storefront Engine...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f7] text-gray-800">
      
      {/* 🟥 MAIN RED BRANDING HEADER */}
      <header className="bg-[#e21b22] text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Branding */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}>
            <span className="text-3xl font-black tracking-tight text-white">shwapno</span>
            <span className="w-3 h-3 rounded-full bg-[#fce303]"></span>
          </div>

          {/* 🔍 Central Marketplace Search Bar Section */}
          <div className="flex-1 max-w-2xl w-full flex items-center gap-3">
            
            {/* 🎛️ Toggle Switch for Search Modes */}
            <div className="flex flex-col items-center justify-center min-w-[110px]">
              <button 
                onClick={() => setIsSemanticSearch(!isSemanticSearch)}
                className={`w-16 h-7 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 relative ${
                  isSemanticSearch ? 'bg-green-500 justify-start' : 'bg-gray-400 justify-end'
                }`}
              >
                {/* Mode Labels inside the switch */}
                {isSemanticSearch ? (
                  <span className="absolute right-2 text-[10px] font-bold text-white select-none">ON</span>
                ) : (
                  <span className="absolute left-2 text-[10px] font-bold text-white select-none">OFF</span>
                )}
                
                {/* Sliding white ball */}
                <div className="bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-300"></div>
              </button>
              
              {/* Dynamic Status Text Indicator */}
              <span className="text-[10px] mt-0.5 font-medium tracking-wide text-white/90 whitespace-nowrap">
                {isSemanticSearch ? "Semantic Search On" : "Normal Mode"}
              </span>
            </div>

            {/* 📷 Image Input Button Accent */}
            <label className="flex items-center justify-center bg-white/20 hover:bg-white/30 transition-colors p-2 rounded-md cursor-pointer h-9 w-9 shrink-0" title="Search by image">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="hidden" 
              />
            </label>

            {/* Native Input fields */}
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

          {/* 🔐 Dynamic Authentication Action Panel */}
          <div className="flex items-center gap-4 text-sm">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <span className="font-medium text-white bg-black/20 px-3 py-1 rounded-full">
                  Hello, <b>{userData.name || userData.first_name}</b>
                </span>
                <button onClick={() => { setIsLoggedIn(false); setUserData(null); }} className="text-xs underline text-yellow-200 hover:text-white">Logout</button>
              </div>
            ) : isRegisterMode ? (
              <form onSubmit={handleRegister} className="flex flex-wrap items-center gap-2 bg-white/10 p-2 rounded-md">
                <input 
                  type="text" placeholder="First Name" required
                  value={firstNameInput} onChange={(e) => setFirstNameInput(e.target.value)}
                  className="bg-white text-gray-900 px-2 py-1 rounded text-xs focus:outline-none w-24" 
                />
                <input 
                  type="text" placeholder="Last Name"
                  value={lastNameInput} onChange={(e) => setLastNameInput(e.target.value)}
                  className="bg-white text-gray-900 px-2 py-1 rounded text-xs focus:outline-none w-24" 
                />
                <input 
                  type="email" placeholder="Email" required
                  value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                  className="bg-white text-gray-900 px-2 py-1 rounded text-xs focus:outline-none w-32" 
                />
                <button type="submit" className="bg-[#fce303] text-gray-900 font-bold px-2 py-1 rounded text-xs hover:bg-yellow-400">
                  Join
                </button>
                <button type="button" onClick={() => setIsRegisterMode(false)} className="text-xs text-white underline ml-1">Cancel</button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="flex items-center gap-2 bg-white/10 p-1.5 rounded-md">
                <input 
                  type="email" placeholder="Enter email to login" required
                  value={emailInput} onChange={(e) => setEmailInput(e.target.value)}
                  className="bg-white text-gray-900 px-2 py-1 rounded text-xs focus:outline-none w-40" 
                />
                <button type="submit" className="bg-[#fce303] text-gray-900 font-bold px-3 py-1 rounded text-xs hover:bg-yellow-400">
                  Login
                </button>
                <button type="button" onClick={() => setIsRegisterMode(true)} className="text-xs text-yellow-200 hover:text-white underline ml-1">
                  Register
                </button>
              </form>
            )}
          </div>

        </div>
      </header>

      {/* 🗺️ THREE-COLUMN LAYOUT MATRIX */}
      <div className="max-w-[1400px] mx-auto w-full px-4 py-6 flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* 🗂️ LEFT SIDE: INTERACTIVE CATEGORIES SIDEBAR */}
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

        {/* 🛒 CENTER ROW: FILTERED PRODUCT VIEW DISPLAY */}
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

        {/* 🛍️ RIGHT SIDE: INTERACTIVE SHOPPING BAG WITH DELETE ACTIONS */}
        <aside className="md:col-span-1 bg-white rounded-lg border border-gray-200 shadow-sm p-4 h-fit sticky top-20">
          <h3 className="font-bold text-gray-900 text-sm border-b border-gray-100 pb-3 mb-3 flex justify-between items-center">
            <span>My Shopping Bag</span>
            <span className="bg-[#e21b22] text-white text-xs px-2 py-0.5 rounded-full font-mono">
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </span>
          </h3>

          {cart.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">Your bag is empty. Add items to checkout.</div>
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