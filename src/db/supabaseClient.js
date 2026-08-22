import { createClient } from '@supabase/supabase-js';
import * as mockData from './mockData';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Real Supabase client instance (if configured)
export const realSupabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

// Mock database layer using LocalStorage
class MockDatabase {
  constructor() {
    this.initDatabase();
  }

  initDatabase() {
    // Helper to get or set initial data
    const getOrSet = (key, initial) => {
      const stored = localStorage.getItem(`gt_${key}`);
      if (!stored) {
        localStorage.setItem(`gt_${key}`, JSON.stringify(initial));
        return initial;
      }
      return JSON.parse(stored);
    };

    // Initialize mock database tables
    getOrSet('profiles', [mockData.MOCK_PROFILE]);
    getOrSet('trips', mockData.MOCK_TRIPS);
    getOrSet('trip_stops', mockData.MOCK_STOPS);
    getOrSet('destinations', mockData.DEFAULT_DESTINATIONS);
    getOrSet('activities', mockData.DEFAULT_ACTIVITIES);
    getOrSet('itinerary_items', mockData.MOCK_ITINERARY);
    getOrSet('expenses', mockData.MOCK_EXPENSES);
    getOrSet('community_trips', mockData.MOCK_COMMUNITY_TRIPS);
    getOrSet('timeline', mockData.MOCK_TIMELINE);
    getOrSet('likes', []);
    getOrSet('shared_trips', [
      { id: "share-ee", trip_id: "trip-european-explorer", share_token: "shared-ee-explorer" }
    ]);
    getOrSet('chat_conversations', []);
    getOrSet('chat_messages', []);

    // Active session mock
    const activeUser = localStorage.getItem('gt_active_user');
    if (!activeUser) {
      localStorage.setItem('gt_active_user', JSON.stringify(mockData.MOCK_PROFILE));
    }
  }

  getTable(name) {
    return JSON.parse(localStorage.getItem(`gt_${name}`) || '[]');
  }

  saveTable(name, data) {
    localStorage.setItem(`gt_${name}`, JSON.stringify(data));
  }

  // Auth Operations
  getActiveUser() {
    return JSON.parse(localStorage.getItem('gt_active_user'));
  }

  signIn(email, password) {
    const profiles = this.getTable('profiles');
    let user = null;

    if (email === 'alex@globetrotter.com' || email === 'demo@globetrotter.com') {
      user = profiles.find(p => p.id === 'profile-alex-johnson' || p.email === 'alex@globetrotter.com') || {
        ...mockData.MOCK_PROFILE,
        id: 'profile-alex-johnson',
        email: 'alex@globetrotter.com'
      };
      if (!profiles.some(p => p.id === user.id)) {
        profiles.push(user);
        this.saveTable('profiles', profiles);
      }
    } else if (email === 'admin@globetrotter.com' || email.toLowerCase().includes('admin')) {
      user = profiles.find(p => p.email === email);
      if (!user) {
        user = {
          id: 'profile-admin',
          full_name: 'Platform Administrator',
          email: email,
          avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80',
          country: 'Global',
          bio: 'GlobalTrotter System Administrator',
          is_admin: true
        };
        profiles.push(user);
      } else {
        user.is_admin = true;
      }
      this.saveTable('profiles', profiles);
    } else {
      user = profiles.find(p => p.email === email);
      if (!user) {
        user = {
          id: "profile-" + Math.random().toString(36).substring(2, 9),
          full_name: email.split('@')[0],
          avatar_url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
          country: "Global",
          bio: "Digital Traveler Passport holder.",
          email: email,
          is_admin: false,
          cities_visited: 0,
          countries_visited: 0,
          days_traveled: 0,
          total_spent: 0
        };
        profiles.push(user);
        this.saveTable('profiles', profiles);
      }
    }

    localStorage.setItem('gt_active_user', JSON.stringify(user));
    return { data: { user }, error: null };
  }

  signUp(email, password, meta) {
    const profiles = this.getTable('profiles');
    const newUser = {
      id: "profile-" + Math.random().toString(36).substring(2, 9),
      full_name: `${meta.firstName || 'Traveler'} ${meta.lastName || ''}`.trim(),
      avatar_url: meta.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80",
      country: meta.country || "Global",
      bio: meta.bio || "Digital Traveler Passport holder.",
      is_admin: email.toLowerCase().includes('admin'),
      cities_visited: 0,
      countries_visited: 0,
      days_traveled: 0,
      total_spent: 0,
      email: email,
      phone: meta.phone || "",
      city: meta.city || ""
    };
    profiles.push(newUser);
    this.saveTable('profiles', profiles);
    localStorage.setItem('gt_active_user', JSON.stringify(newUser));
    return { data: { user: newUser }, error: null };
  }

  signOut() {
    localStorage.removeItem('gt_active_user');
    return { error: null };
  }

  updateProfile(userId, data) {
    const profiles = this.getTable('profiles');
    const index = profiles.findIndex(p => p.id === userId);
    if (index !== -1) {
      profiles[index] = { ...profiles[index], ...data };
      this.saveTable('profiles', profiles);
      
      const active = this.getActiveUser();
      if (active && active.id === userId) {
        localStorage.setItem('gt_active_user', JSON.stringify(profiles[index]));
      }
      return { data: profiles[index], error: null };
    }
    return { data: null, error: 'Profile not found' };
  }

  // Trips Operations
  getTrips(userId) {
    const trips = this.getTable('trips');
    const userTrips = trips.filter(t => t.user_id === userId);
    
    const stops = this.getTable('trip_stops');
    const dests = this.getTable('destinations');
    
    return userTrips.map(t => {
      const tripStops = stops
        .filter(s => s.trip_id === t.id)
        .sort((a, b) => a.stop_order - b.stop_order);
      
      const cities = tripStops.map(s => {
        const d = dests.find(dest => dest.id === s.destination_id);
        return d ? d.name : '';
      }).filter(Boolean);

      const sDate = new Date(t.start_date);
      const eDate = new Date(t.end_date);
      const diffTime = Math.abs(eDate - sDate);
      const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

      return {
        ...t,
        cities,
        duration_days: duration
      };
    });
  }

  getTrip(tripId) {
    const trips = this.getTable('trips');
    const trip = trips.find(t => t.id === tripId);
    if (!trip) return null;

    const stops = this.getTable('trip_stops');
    const dests = this.getTable('destinations');
    const tripStops = stops
      .filter(s => s.trip_id === trip.id)
      .sort((a, b) => a.stop_order - b.stop_order);
    
    const stopDestinations = tripStops.map(s => {
      const d = dests.find(dest => dest.id === s.destination_id);
      return {
        stop_id: s.id,
        stop_order: s.stop_order,
        ...d
      };
    }).filter(d => d.id);

    const sDate = new Date(trip.start_date);
    const eDate = new Date(trip.end_date);
    const diffTime = Math.abs(eDate - sDate);
    const duration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;

    return {
      ...trip,
      destinations: stopDestinations,
      duration_days: duration
    };
  }

  createTrip(userId, tripData) {
    const trips = this.getTable('trips');
    const newTrip = {
      id: "trip-" + Math.random().toString(36).substring(2, 9),
      user_id: userId,
      name: tripData.name,
      description: tripData.description || "",
      cover_image: tripData.cover_image || "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80",
      start_date: tripData.start_date,
      end_date: tripData.end_date,
      budget: Number(tripData.budget || 0),
      currency: tripData.currency || "INR",
      travel_preferences: tripData.travel_preferences || {},
      is_public: false,
      created_at: new Date().toISOString()
    };
    trips.push(newTrip);
    this.saveTable('trips', trips);

    if (tripData.destinations && Array.isArray(tripData.destinations)) {
      tripData.destinations.forEach((destId, index) => {
        this.addTripStop(newTrip.id, destId, index + 1);
      });
    }

    this.addTimelineItem(`You created a new trip`, newTrip.name, "#C94F82");
    return newTrip;
  }

  updateTrip(tripId, tripData) {
    const trips = this.getTable('trips');
    const index = trips.findIndex(t => t.id === tripId);
    if (index !== -1) {
      trips[index] = { ...trips[index], ...tripData };
      this.saveTable('trips', trips);
      return trips[index];
    }
    return null;
  }

  deleteTrip(tripId) {
    const trips = this.getTable('trips');
    const filtered = trips.filter(t => t.id !== tripId);
    this.saveTable('trips', filtered);

    const stops = this.getTable('trip_stops').filter(s => s.trip_id !== tripId);
    this.saveTable('trip_stops', stops);

    const itinerary = this.getTable('itinerary_items').filter(i => i.trip_id !== tripId);
    this.saveTable('itinerary_items', itinerary);

    const expenses = this.getTable('expenses').filter(e => e.trip_id !== tripId);
    this.saveTable('expenses', expenses);

    return true;
  }

  // Trip Stops
  addTripStop(tripId, destinationId, order) {
    const stops = this.getTable('trip_stops');
    const newStop = {
      id: "stop-" + Math.random().toString(36).substring(2, 9),
      trip_id: tripId,
      destination_id: destinationId,
      stop_order: order,
      created_at: new Date().toISOString()
    };
    stops.push(newStop);
    this.saveTable('trip_stops', stops);
    return newStop;
  }

  updateTripStopsOrder(tripId, stopDestinations) {
    let stops = this.getTable('trip_stops');
    stops = stops.filter(s => s.trip_id !== tripId);
    stopDestinations.forEach((dest, index) => {
      stops.push({
        id: dest.stop_id || "stop-" + Math.random().toString(36).substring(2, 9),
        trip_id: tripId,
        destination_id: dest.id,
        stop_order: index + 1,
        created_at: new Date().toISOString()
      });
    });
    this.saveTable('trip_stops', stops);
    
    const trip = this.getTable('trips').find(t => t.id === tripId);
    if (trip && stopDestinations.length > 0) {
      this.addTimelineItem(`Updated route for your itinerary`, trip.name, "#48B7B0");
    }
  }

  // Itinerary Items
  getItineraryItems(tripId) {
    const items = this.getTable('itinerary_items');
    return items
      .filter(i => i.trip_id === tripId)
      .sort((a, b) => {
        if (a.day_number !== b.day_number) {
          return a.day_number - b.day_number;
        }
        if (a.order_index !== undefined && b.order_index !== undefined) {
          return a.order_index - b.order_index;
        }
        return a.start_time.localeCompare(b.start_time);
      });
  }

  addItineraryItem(tripId, itemData) {
    const items = this.getTable('itinerary_items');
    const dayItems = items.filter(i => i.trip_id === tripId && i.day_number === Number(itemData.day_number || 1));
    const newItem = {
      id: "iti-" + Math.random().toString(36).substring(2, 9),
      trip_id: tripId,
      day_number: Number(itemData.day_number || 1),
      start_time: itemData.start_time || "09:00",
      activity_name: itemData.activity_name,
      duration_mins: Number(itemData.duration_mins || 60),
      cost: Number(itemData.cost || 0),
      order_index: dayItems.length,
      activity_id: itemData.activity_id || null,
      created_at: new Date().toISOString()
    };
    items.push(newItem);
    this.saveTable('itinerary_items', items);

    const trip = this.getTable('trips').find(t => t.id === tripId);
    if (trip) {
      this.addTimelineItem(`Added ${newItem.activity_name} to Day ${newItem.day_number}`, trip.name, "#E6B83D");
      this.addExpense(tripId, {
        category: 'Activities',
        amount: newItem.cost,
        description: `Activity: ${newItem.activity_name} (Day ${newItem.day_number})`,
        date: this.getTripDayDate(trip.start_date, newItem.day_number)
      });
    }

    return newItem;
  }

  reorderItinerary(tripId, updatedItems) {
    const items = this.getTable('itinerary_items');
    updatedItems.forEach((uItem, idx) => {
      const match = items.find(i => i.id === uItem.id);
      if (match) {
        match.order_index = idx;
      }
    });
    this.saveTable('itinerary_items', items);
    return true;
  }

  deleteItineraryItem(tripId, itemId) {
    const items = this.getTable('itinerary_items');
    const itemToDelete = items.find(i => i.id === itemId);
    const filtered = items.filter(i => i.id !== itemId);
    this.saveTable('itinerary_items', filtered);

    if (itemToDelete) {
      const expenses = this.getTable('expenses');
      const descMatch = `Activity: ${itemToDelete.activity_name} (Day ${itemToDelete.day_number})`;
      const expFiltered = expenses.filter(e => !(e.trip_id === tripId && e.description === descMatch));
      this.saveTable('expenses', expFiltered);
    }
    return true;
  }

  getTripDayDate(startDateStr, dayNumber) {
    const date = new Date(startDateStr);
    date.setDate(date.getDate() + (dayNumber - 1));
    return date.toISOString().split('T')[0];
  }

  // Expenses
  getExpenses(tripId) {
    const expenses = this.getTable('expenses');
    return expenses.filter(e => e.trip_id === tripId);
  }

  addExpense(tripId, expenseData) {
    const expenses = this.getTable('expenses');
    const newExpense = {
      id: "exp-" + Math.random().toString(36).substring(2, 9),
      trip_id: tripId,
      category: expenseData.category || 'Other',
      amount: Number(expenseData.amount || 0),
      description: expenseData.description || "",
      date: expenseData.date || new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString()
    };
    expenses.push(newExpense);
    this.saveTable('expenses', expenses);
    return newExpense;
  }

  deleteExpense(expenseId) {
    const expenses = this.getTable('expenses');
    const filtered = expenses.filter(e => e.id !== expenseId);
    this.saveTable('expenses', filtered);
    return true;
  }

  // Predefined lists
  getDestinations() {
    return this.getTable('destinations');
  }

  getActivities(destinationId) {
    const acts = this.getTable('activities');
    if (!destinationId) return acts;
    return acts.filter(a => a.destination_id === destinationId);
  }

  // Timeline
  getTimeline() {
    return this.getTable('timeline');
  }

  addTimelineItem(text, tripName, color) {
    const timeline = this.getTable('timeline');
    const newItem = {
      id: "timeline-" + Math.random().toString(36).substring(2, 9),
      text,
      tripName,
      color: color || '#C94F82',
      time: "Just now"
    };
    timeline.unshift(newItem);
    this.saveTable('timeline', timeline.slice(0, 10));
  }

  // Likes & Community
  likeTrip(tripId, userId) {
    const likes = this.getTable('likes');
    const exists = likes.find(l => l.trip_id === tripId && l.user_id === userId);
    if (!exists) {
      likes.push({
        id: "like-" + Math.random().toString(36).substring(2, 9),
        trip_id: tripId,
        user_id: userId,
        created_at: new Date().toISOString()
      });
      this.saveTable('likes', likes);
    }
    return true;
  }

  unlikeTrip(tripId, userId) {
    const likes = this.getTable('likes');
    const filtered = likes.filter(l => !(l.trip_id === tripId && l.user_id === userId));
    this.saveTable('likes', filtered);
    return true;
  }

  getCommunityTrips(currentUserId = null) {
    const commTrips = this.getTable('community_trips');
    const likes = this.getTable('likes');

    return commTrips.map(c => {
      const tripLikes = likes.filter(l => l.trip_id === c.id);
      const isLiked = currentUserId ? likes.some(l => l.trip_id === c.id && l.user_id === currentUserId) : false;
      return {
        ...c,
        likes: c.likes + tripLikes.length,
        is_liked: isLiked
      };
    });
  }

  publishTrip(tripId) {
    const trips = this.getTable('trips');
    const tripIndex = trips.findIndex(t => t.id === tripId);
    if (tripIndex === -1) return null;

    trips[tripIndex].is_public = true;
    this.saveTable('trips', trips);

    const shareToken = "shared-" + Math.random().toString(36).substring(2, 9);
    const shares = this.getTable('shared_trips');
    const newShare = {
      id: "share-" + Math.random().toString(36).substring(2, 9),
      trip_id: tripId,
      share_token: shareToken,
      created_at: new Date().toISOString()
    };
    shares.push(newShare);
    this.saveTable('shared_trips', shares);

    const community = this.getTable('community_trips');
    const activeUser = this.getActiveUser();
    const trip = trips[tripIndex];
    
    const stops = this.getTable('trip_stops');
    const dests = this.getTable('destinations');
    const tripStops = stops.filter(s => s.trip_id === trip.id).sort((a, b) => a.stop_order - b.stop_order);
    const cities = tripStops.map(s => {
      const d = dests.find(dest => dest.id === s.destination_id);
      return d ? d.name : '';
    }).filter(Boolean);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const sD = new Date(trip.start_date);
    const eD = new Date(trip.end_date);
    const dateRangeStr = `${months[sD.getMonth()]} ${sD.getDate()} — ${months[eD.getMonth()]} ${eD.getDate()}, ${sD.getFullYear()}`;

    community.unshift({
      id: "pub-" + Math.random().toString(36).substring(2, 9),
      author: activeUser.full_name,
      author_avatar: activeUser.avatar_url,
      name: trip.name,
      cover_image: trip.cover_image,
      cities: cities,
      dates: dateRangeStr,
      duration: trip.duration_days || 10,
      budget: trip.budget,
      currency: trip.currency,
      likes: 0,
      stops: cities.map(c => ({ name: c, days: 2 }))
    });
    this.saveTable('community_trips', community);

    return shareToken;
  }

  getPublicTrip(shareToken) {
    const shares = this.getTable('shared_trips');
    const share = shares.find(s => s.share_token === shareToken);
    if (!share) {
      const commTrips = this.getTable('community_trips');
      const comm = commTrips.find(c => c.id === shareToken);
      if (comm) {
        return {
          id: comm.id,
          name: comm.name,
          author: comm.author,
          cover_image: comm.cover_image,
          budget: comm.budget,
          currency: comm.currency,
          cities: comm.cities,
          dates: comm.dates,
          duration_days: comm.duration,
          destinations: comm.stops.map((s, idx) => ({ id: `dest-mock-${idx}`, name: s.name, country: "" })),
          itinerary: []
        };
      }
      return null;
    }
    
    const trip = this.getTrip(share.trip_id);
    if (!trip) return null;

    const profiles = this.getTable('profiles');
    const authorProf = profiles.find(p => p.id === trip.user_id);

    return {
      ...trip,
      author: authorProf ? authorProf.full_name : "Alex Johnson",
      itinerary: this.getItineraryItems(trip.id)
    };
  }

  cloneTrip(sharedTripId, targetUserId) {
    let srcTrip = null;
    let srcStops = [];
    let srcItinerary = [];
    let srcExpenses = [];

    const trips = this.getTable('trips');
    const shares = this.getTable('shared_trips');
    const share = shares.find(s => s.share_token === sharedTripId);
    
    if (share) {
      srcTrip = trips.find(t => t.id === share.trip_id);
      if (srcTrip) {
        srcStops = this.getTable('trip_stops').filter(s => s.trip_id === srcTrip.id);
        srcItinerary = this.getTable('itinerary_items').filter(i => i.trip_id === srcTrip.id);
        srcExpenses = this.getTable('expenses').filter(e => e.trip_id === srcTrip.id);
      }
    } else {
      const commTrips = this.getTable('community_trips');
      const comm = commTrips.find(c => c.id === sharedTripId);
      if (comm) {
        srcTrip = {
          name: comm.name,
          description: `Clone of ${comm.name} shared by ${comm.author}.`,
          cover_image: comm.cover_image,
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + comm.duration * 24 * 3600 * 1000).toISOString().split('T')[0],
          budget: comm.budget,
          currency: comm.currency,
          travel_preferences: {}
        };
      }
    }

    if (!srcTrip) return null;

    const clonedTripId = "trip-" + Math.random().toString(36).substring(2, 9);
    const newTrip = {
      id: clonedTripId,
      user_id: targetUserId,
      name: `My ${srcTrip.name}`,
      description: srcTrip.description || "",
      cover_image: srcTrip.cover_image,
      start_date: srcTrip.start_date || new Date().toISOString().split('T')[0],
      end_date: srcTrip.end_date || new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split('T')[0],
      budget: Number(srcTrip.budget),
      currency: srcTrip.currency || 'INR',
      travel_preferences: srcTrip.travel_preferences || {},
      is_public: false,
      created_at: new Date().toISOString()
    };
    
    trips.push(newTrip);
    this.saveTable('trips', trips);

    const stops = this.getTable('trip_stops');
    if (srcStops.length > 0) {
      srcStops.forEach(s => {
        stops.push({
          id: "stop-" + Math.random().toString(36).substring(2, 9),
          trip_id: clonedTripId,
          destination_id: s.destination_id,
          stop_order: s.stop_order,
          created_at: new Date().toISOString()
        });
      });
    } else {
      const allDests = this.getTable('destinations');
      const commStops = srcTrip.cities || (sharedTripId.startsWith('pub-') ? this.getTable('community_trips').find(c => c.id === sharedTripId)?.cities : null);
      if (commStops && Array.isArray(commStops)) {
        commStops.forEach((cityName, idx) => {
          const match = allDests.find(d => d.name.toLowerCase() === cityName.toLowerCase());
          if (match) {
            stops.push({
              id: "stop-" + Math.random().toString(36).substring(2, 9),
              trip_id: clonedTripId,
              destination_id: match.id,
              stop_order: idx + 1,
              created_at: new Date().toISOString()
            });
          }
        });
      }
    }
    this.saveTable('trip_stops', stops);

    const itinerary = this.getTable('itinerary_items');
    if (srcItinerary.length > 0) {
      srcItinerary.forEach((i, idx) => {
        itinerary.push({
          id: "iti-" + Math.random().toString(36).substring(2, 9),
          trip_id: clonedTripId,
          day_number: i.day_number,
          start_time: i.start_time,
          activity_name: i.activity_name,
          duration_mins: i.duration_mins,
          cost: i.cost,
          order_index: idx,
          activity_id: i.activity_id,
          created_at: new Date().toISOString()
        });
      });
    } else {
      itinerary.push(
        { id: "iti-" + Math.random().toString(36).substring(2, 9), trip_id: clonedTripId, day_number: 1, start_time: "09:00", activity_name: "Hotel Check-in & Coffee", duration_mins: 60, cost: 350, order_index: 0 },
        { id: "iti-" + Math.random().toString(36).substring(2, 9), trip_id: clonedTripId, day_number: 1, start_time: "10:30", activity_name: "Discover Main Square & Walking Tour", duration_mins: 120, cost: 0, order_index: 1 },
        { id: "iti-" + Math.random().toString(36).substring(2, 9), trip_id: clonedTripId, day_number: 1, start_time: "13:00", activity_name: "Local Food Tasting", duration_mins: 90, cost: 1200, order_index: 2 }
      );
    }
    this.saveTable('itinerary_items', itinerary);

    const expenses = this.getTable('expenses');
    if (srcExpenses.length > 0) {
      srcExpenses.forEach(e => {
        expenses.push({
          id: "exp-" + Math.random().toString(36).substring(2, 9),
          trip_id: clonedTripId,
          category: e.category,
          amount: e.amount,
          description: e.description,
          date: e.date,
          created_at: new Date().toISOString()
        });
      });
    } else {
      expenses.push(
        { id: "exp-" + Math.random().toString(36).substring(2, 9), trip_id: clonedTripId, category: "Transport", amount: Number(newTrip.budget * 0.4), description: "Cloned trip transport estimate", date: newTrip.start_date },
        { id: "exp-" + Math.random().toString(36).substring(2, 9), trip_id: clonedTripId, category: "Stay", amount: Number(newTrip.budget * 0.35), description: "Cloned trip lodging estimate", date: newTrip.start_date }
      );
    }
    this.saveTable('expenses', expenses);

    this.addTimelineItem(`You cloned a public trip: ${newTrip.name}`, newTrip.name, "#48B7B0");

    return newTrip;
  }

  // Admin Analytics Aggregates
  getAllUsers() {
    const profiles = this.getTable('profiles');
    const trips = this.getTable('trips');
    return profiles.map(p => {
      const userTrips = trips.filter(t => t.user_id === p.id);
      return {
        ...p,
        trips_count: userTrips.length,
        trips: userTrips
      };
    });
  }

  getPopularCities() {
    const stops = this.getTable('trip_stops');
    const dests = this.getTable('destinations');
    const counts = {};
    stops.forEach(s => {
      counts[s.destination_id] = (counts[s.destination_id] || 0) + 1;
    });
    return dests.map(d => ({
      ...d,
      count: counts[d.id] || Math.floor(Math.random() * 3) + 1
    })).sort((a, b) => b.count - a.count);
  }

  getPopularActivities() {
    const items = this.getTable('itinerary_items');
    const activities = this.getTable('activities');
    const counts = {};
    items.forEach(i => {
      const name = i.activity_name;
      counts[name] = counts[name] || { name, count: 0, cost: i.cost, category: 'Activities' };
      counts[name].count += 1;
    });
    activities.forEach(a => {
      if (!counts[a.name]) {
        counts[a.name] = { name: a.name, count: Math.floor(Math.random() * 4) + 1, cost: a.cost, category: a.category };
      }
    });
    return Object.values(counts).sort((a, b) => b.count - a.count);
  }

  getPlatformStats() {
    const profiles = this.getTable('profiles');
    const trips = this.getTable('trips');
    const expenses = this.getTable('expenses');

    const totalUsers = profiles.length || 1;
    const totalTrips = trips.length || 1;
    const totalBudget = trips.reduce((acc, curr) => acc + Number(curr.budget || 0), 0);
    const avgBudget = Math.round(totalBudget / totalTrips);
    const totalExpenses = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

    const now = new Date();
    let ongoing = 0, upcoming = 0, completed = 0;
    trips.forEach(t => {
      const s = new Date(t.start_date);
      const e = new Date(t.end_date);
      if (now >= s && now <= e) ongoing++;
      else if (now < s) upcoming++;
      else completed++;
    });
    if (ongoing === 0 && upcoming === 0 && completed === 0) {
      ongoing = 1; upcoming = 2; completed = 1;
    }

    return {
      totalUsers,
      totalTrips,
      avgBudget,
      totalExpenses,
      statusBreakdown: { ongoing, upcoming, completed },
      tripsOverTime: [
        { month: 'Jan', count: 2 },
        { month: 'Feb', count: 3 },
        { month: 'Mar', count: 5 },
        { month: 'Apr', count: 4 },
        { month: 'May', count: 7 }
      ]
    };
  }
}

export const mockDb = new MockDatabase();

// Centralized Db Client Wrapper
export const db = {
  auth: {
    getUser: async () => {
      if (realSupabase) {
        const { data: { user } } = await realSupabase.auth.getUser();
        if (user) {
          const { data: prof } = await realSupabase.from('profiles').select('*').eq('id', user.id).single();
          return { data: { user: { ...user, ...prof } }, error: null };
        }
        return { data: { user: null }, error: null };
      }
      const user = mockDb.getActiveUser();
      return { data: { user }, error: null };
    },
    signIn: async (email, password) => {
      if (realSupabase) {
        return await realSupabase.auth.signInWithPassword({ email, password });
      }
      return mockDb.signIn(email, password);
    },
    signUp: async (email, password, metadata) => {
      if (realSupabase) {
        return await realSupabase.auth.signUp({
          email,
          password,
          options: { data: metadata }
        });
      }
      return mockDb.signUp(email, password, metadata);
    },
    signOut: async () => {
      if (realSupabase) {
        return await realSupabase.auth.signOut();
      }
      return mockDb.signOut();
    }
  },

  profiles: {
    get: async (userId) => {
      if (realSupabase) {
        return await realSupabase.from('profiles').select('*').eq('id', userId).single();
      }
      const profiles = mockDb.getTable('profiles');
      const profile = profiles.find(p => p.id === userId);
      return { data: profile || null, error: profile ? null : 'Not found' };
    },
    update: async (userId, data) => {
      if (realSupabase) {
        return await realSupabase.from('profiles').update(data).eq('id', userId).select().single();
      }
      return mockDb.updateProfile(userId, data);
    }
  },

  trips: {
    list: async (userId) => {
      if (realSupabase) {
        const { data, error } = await realSupabase
          .from('trips')
          .select('*, trip_stops(*, destinations(*))')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        
        if (error) return { data: null, error };
        
        const mapped = data.map(t => {
          const sortedStops = (t.trip_stops || []).sort((a, b) => a.stop_order - b.stop_order);
          const cities = sortedStops.map(s => s.destinations?.name).filter(Boolean);
          const sDate = new Date(t.start_date);
          const eDate = new Date(t.end_date);
          const duration = Math.ceil(Math.abs(eDate - sDate) / (1000 * 60 * 60 * 24)) || 1;
          return {
            ...t,
            cities,
            duration_days: duration
          };
        });
        return { data: mapped, error: null };
      }
      return { data: mockDb.getTrips(userId), error: null };
    },
    get: async (tripId) => {
      if (realSupabase) {
        const { data, error } = await realSupabase
          .from('trips')
          .select('*, trip_stops(*, destinations(*))')
          .eq('id', tripId)
          .single();
        
        if (error) return { data: null, error };
        
        const sortedStops = (data.trip_stops || []).sort((a, b) => a.stop_order - b.stop_order);
        const destinations = sortedStops.map(s => ({
          stop_id: s.id,
          stop_order: s.stop_order,
          ...s.destinations
        })).filter(d => d.id);

        const sDate = new Date(data.start_date);
        const eDate = new Date(data.end_date);
        const duration = Math.ceil(Math.abs(eDate - sDate) / (1000 * 60 * 60 * 24)) || 1;

        return {
          data: { ...data, destinations, duration_days: duration },
          error: null
        };
      }
      const trip = mockDb.getTrip(tripId);
      return { data: trip, error: trip ? null : 'Trip not found' };
    },
    create: async (userId, tripData) => {
      if (realSupabase) {
        const { data, error } = await realSupabase
          .from('trips')
          .insert({
            user_id: userId,
            name: tripData.name,
            description: tripData.description,
            cover_image: tripData.cover_image,
            start_date: tripData.start_date,
            end_date: tripData.end_date,
            budget: tripData.budget,
            currency: tripData.currency,
            travel_preferences: tripData.travel_preferences
          })
          .select()
          .single();

        if (error) return { data: null, error };

        if (tripData.destinations && Array.isArray(tripData.destinations)) {
          const stopsToInsert = tripData.destinations.map((destId, index) => ({
            trip_id: data.id,
            destination_id: destId,
            stop_order: index + 1
          }));
          await realSupabase.from('trip_stops').insert(stopsToInsert);
        }
        return { data, error: null };
      }
      return { data: mockDb.createTrip(userId, tripData), error: null };
    },
    update: async (tripId, tripData) => {
      if (realSupabase) {
        return await realSupabase.from('trips').update(tripData).eq('id', tripId).select().single();
      }
      return { data: mockDb.updateTrip(tripId, tripData), error: null };
    },
    delete: async (tripId) => {
      if (realSupabase) {
        return await realSupabase.from('trips').delete().eq('id', tripId);
      }
      return { data: mockDb.deleteTrip(tripId), error: null };
    },
    updateStopsOrder: async (tripId, stopDestinations) => {
      if (realSupabase) {
        await realSupabase.from('trip_stops').delete().eq('trip_id', tripId);
        const stopsToInsert = stopDestinations.map((dest, idx) => ({
          trip_id: tripId,
          destination_id: dest.id,
          stop_order: idx + 1
        }));
        return await realSupabase.from('trip_stops').insert(stopsToInsert);
      }
      mockDb.updateTripStopsOrder(tripId, stopDestinations);
      return { error: null };
    }
  },

  itinerary: {
    list: async (tripId) => {
      if (realSupabase) {
        return await realSupabase
          .from('itinerary_items')
          .select('*')
          .eq('trip_id', tripId)
          .order('day_number')
          .order('order_index', { ascending: true })
          .order('start_time');
      }
      return { data: mockDb.getItineraryItems(tripId), error: null };
    },
    add: async (tripId, itemData) => {
      if (realSupabase) {
        return await realSupabase
          .from('itinerary_items')
          .insert({ trip_id: tripId, ...itemData })
          .select()
          .single();
      }
      return { data: mockDb.addItineraryItem(tripId, itemData), error: null };
    },
    reorder: async (tripId, updatedItems) => {
      if (realSupabase) {
        const promises = updatedItems.map((item, idx) =>
          realSupabase.from('itinerary_items').update({ order_index: idx }).eq('id', item.id)
        );
        await Promise.all(promises);
        return { error: null };
      }
      mockDb.reorderItinerary(tripId, updatedItems);
      return { error: null };
    },
    delete: async (tripId, itemId) => {
      if (realSupabase) {
        return await realSupabase.from('itinerary_items').delete().eq('id', itemId);
      }
      return { data: mockDb.deleteItineraryItem(tripId, itemId), error: null };
    }
  },

  expenses: {
    list: async (tripId) => {
      if (realSupabase) {
        return await realSupabase.from('expenses').select('*').eq('trip_id', tripId);
      }
      return { data: mockDb.getExpenses(tripId), error: null };
    },
    add: async (tripId, expenseData) => {
      if (realSupabase) {
        return await realSupabase
          .from('expenses')
          .insert({ trip_id: tripId, ...expenseData })
          .select()
          .single();
      }
      return { data: mockDb.addExpense(tripId, expenseData), error: null };
    },
    delete: async (expenseId) => {
      if (realSupabase) {
        return await realSupabase.from('expenses').delete().eq('id', expenseId);
      }
      return { data: mockDb.deleteExpense(expenseId), error: null };
    }
  },

  destinations: {
    list: async () => {
      if (realSupabase) {
        return await realSupabase.from('destinations').select('*');
      }
      return { data: mockDb.getDestinations(), error: null };
    }
  },

  activities: {
    list: async (destinationId = null) => {
      if (realSupabase) {
        let q = realSupabase.from('activities').select('*');
        if (destinationId) q = q.eq('destination_id', destinationId);
        return await q;
      }
      return { data: mockDb.getActivities(destinationId), error: null };
    }
  },

  community: {
    list: async (currentUserId = null) => {
      if (realSupabase) {
        const { data, error } = await realSupabase
          .from('trips')
          .select('*, profiles(full_name, avatar_url), trip_stops(*, destinations(*)), likes(*)')
          .eq('is_public', true)
          .order('created_at', { ascending: false });
        
        if (error) return { data: null, error };

        const mapped = data.map(t => {
          const sortedStops = (t.trip_stops || []).sort((a, b) => a.stop_order - b.stop_order);
          const cities = sortedStops.map(s => s.destinations?.name).filter(Boolean);
          const sDate = new Date(t.start_date);
          const eDate = new Date(t.end_date);
          const duration = Math.ceil(Math.abs(eDate - sDate) / (1000 * 60 * 60 * 24)) || 1;
          const likesList = t.likes || [];
          const isLiked = currentUserId ? likesList.some(l => l.user_id === currentUserId) : false;

          return {
            id: t.id,
            author: t.profiles?.full_name || 'Alex Johnson',
            author_avatar: t.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80',
            name: t.name,
            cover_image: t.cover_image,
            cities: cities,
            dates: `${sDate.toLocaleDateString()} - ${eDate.toLocaleDateString()}`,
            duration: duration,
            budget: t.budget,
            currency: t.currency,
            likes: likesList.length,
            is_liked: isLiked,
            stops: cities.map(c => ({ name: c, days: 2 }))
          };
        });
        return { data: mapped, error: null };
      }
      return { data: mockDb.getCommunityTrips(currentUserId), error: null };
    },

    like: async (tripId, userId) => {
      if (realSupabase) {
        return await realSupabase.from('likes').insert({ trip_id: tripId, user_id: userId });
      }
      return { data: mockDb.likeTrip(tripId, userId), error: null };
    },

    unlike: async (tripId, userId) => {
      if (realSupabase) {
        return await realSupabase.from('likes').delete().eq('trip_id', tripId).eq('user_id', userId);
      }
      return { data: mockDb.unlikeTrip(tripId, userId), error: null };
    },

    publish: async (tripId) => {
      if (realSupabase) {
        await realSupabase.from('trips').update({ is_public: true }).eq('id', tripId);
        const shareToken = "shared-" + Math.random().toString(36).substring(2, 9);
        await realSupabase.from('shared_trips').insert({ trip_id: tripId, share_token: shareToken });
        return { data: shareToken, error: null };
      }
      const token = mockDb.publishTrip(tripId);
      return { data: token, error: token ? null : 'Error publishing' };
    },

    getShared: async (shareToken) => {
      if (realSupabase) {
        const { data, error } = await realSupabase
          .from('shared_trips')
          .select('*, trips(*, profiles(*), trip_stops(*, destinations(*)))')
          .eq('share_token', shareToken)
          .single();

        if (error || !data.trips) return { data: null, error: error || 'Shared trip not found' };

        const tripData = data.trips;
        const sortedStops = (tripData.trip_stops || []).sort((a, b) => a.stop_order - b.stop_order);
        const destinations = sortedStops.map(s => ({
          stop_id: s.id,
          stop_order: s.stop_order,
          ...s.destinations
        })).filter(d => d.id);

        const { data: itinerary } = await realSupabase
          .from('itinerary_items')
          .select('*')
          .eq('trip_id', tripData.id)
          .order('day_number')
          .order('start_time');

        return {
          data: {
            ...tripData,
            author: tripData.profiles?.full_name || 'Alex Johnson',
            destinations,
            itinerary: itinerary || []
          },
          error: null
        };
      }
      const trip = mockDb.getPublicTrip(shareToken);
      return { data: trip, error: trip ? null : 'Shared trip not found' };
    },

    clone: async (sharedTripId, targetUserId) => {
      if (realSupabase) {
        const { data: shared } = await realSupabase
          .from('shared_trips')
          .select('*, trips(*)')
          .eq('share_token', sharedTripId)
          .single();
        
        let srcTrip = shared?.trips;
        if (!srcTrip) {
          const { data: direct } = await realSupabase.from('trips').select('*').eq('id', sharedTripId).single();
          srcTrip = direct;
        }

        if (!srcTrip) return { data: null, error: 'Source trip not found' };

        const { data: newTrip, error: tErr } = await realSupabase
          .from('trips')
          .insert({
            user_id: targetUserId,
            name: `My ${srcTrip.name}`,
            description: srcTrip.description,
            cover_image: srcTrip.cover_image,
            start_date: srcTrip.start_date,
            end_date: srcTrip.end_date,
            budget: srcTrip.budget,
            currency: srcTrip.currency,
            travel_preferences: srcTrip.travel_preferences
          })
          .select()
          .single();

        if (tErr) return { data: null, error: tErr };

        const { data: stops } = await realSupabase.from('trip_stops').select('*').eq('trip_id', srcTrip.id);
        if (stops && stops.length > 0) {
          const stopsToInsert = stops.map(s => ({
            trip_id: newTrip.id,
            destination_id: s.destination_id,
            stop_order: s.stop_order
          }));
          await realSupabase.from('trip_stops').insert(stopsToInsert);
        }

        const { data: itinerary } = await realSupabase.from('itinerary_items').select('*').eq('trip_id', srcTrip.id);
        if (itinerary && itinerary.length > 0) {
          const itineraryToInsert = itinerary.map((i, idx) => ({
            trip_id: newTrip.id,
            day_number: i.day_number,
            start_time: i.start_time,
            activity_name: i.activity_name,
            duration_mins: i.duration_mins,
            cost: i.cost,
            order_index: idx,
            activity_id: i.activity_id
          }));
          await realSupabase.from('itinerary_items').insert(itineraryToInsert);
        }

        const { data: expenses } = await realSupabase.from('expenses').select('*').eq('trip_id', srcTrip.id);
        if (expenses && expenses.length > 0) {
          const expensesToInsert = expenses.map(e => ({
            trip_id: newTrip.id,
            category: e.category,
            amount: e.amount,
            description: e.description,
            date: e.date
          }));
          await realSupabase.from('expenses').insert(expensesToInsert);
        }

        return { data: newTrip, error: null };
      }
      return { data: mockDb.cloneTrip(sharedTripId, targetUserId), error: null };
    }
  },

  admin: {
    getAllUsers: async () => {
      if (realSupabase) {
        const { data: profiles, error } = await realSupabase.from('profiles').select('*, trips(id)');
        if (error) return { data: null, error };
        const mapped = profiles.map(p => ({
          ...p,
          trips_count: (p.trips || []).length
        }));
        return { data: mapped, error: null };
      }
      return { data: mockDb.getAllUsers(), error: null };
    },

    getPopularCities: async () => {
      if (realSupabase) {
        const { data: stops, error } = await realSupabase
          .from('trip_stops')
          .select('destination_id, destinations(name, country, image_url)');
        if (error) return { data: null, error };

        const counts = {};
        stops.forEach(s => {
          const id = s.destination_id;
          if (!counts[id]) {
            counts[id] = {
              id,
              name: s.destinations?.name || 'Unknown',
              country: s.destinations?.country || 'Global',
              image_url: s.destinations?.image_url,
              count: 0
            };
          }
          counts[id].count += 1;
        });

        const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
        return { data: sorted, error: null };
      }
      return { data: mockDb.getPopularCities(), error: null };
    },

    getPopularActivities: async () => {
      if (realSupabase) {
        const { data: items, error } = await realSupabase
          .from('itinerary_items')
          .select('activity_name, cost');
        if (error) return { data: null, error };

        const counts = {};
        items.forEach(i => {
          const name = i.activity_name;
          if (!counts[name]) {
            counts[name] = { name, count: 0, cost: i.cost || 0, category: 'Activities' };
          }
          counts[name].count += 1;
        });

        const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
        return { data: sorted, error: null };
      }
      return { data: mockDb.getPopularActivities(), error: null };
    },

    getPlatformStats: async () => {
      if (realSupabase) {
        const { data: profiles } = await realSupabase.from('profiles').select('id');
        const { data: trips } = await realSupabase.from('trips').select('budget, start_date, end_date');
        const { data: expenses } = await realSupabase.from('expenses').select('amount');

        const totalUsers = (profiles || []).length || 1;
        const totalTrips = (trips || []).length || 1;
        const totalBudget = (trips || []).reduce((a, c) => a + Number(c.budget || 0), 0);
        const avgBudget = Math.round(totalBudget / totalTrips);
        const totalExpenses = (expenses || []).reduce((a, c) => a + Number(c.amount || 0), 0);

        const now = new Date();
        let ongoing = 0, upcoming = 0, completed = 0;
        (trips || []).forEach(t => {
          const s = new Date(t.start_date);
          const e = new Date(t.end_date);
          if (now >= s && now <= e) ongoing++;
          else if (now < s) upcoming++;
          else completed++;
        });

        return {
          data: {
            totalUsers,
            totalTrips,
            avgBudget,
            totalExpenses,
            statusBreakdown: { ongoing, upcoming, completed },
            tripsOverTime: [
              { month: 'Jan', count: 1 },
              { month: 'Feb', count: 2 },
              { month: 'Mar', count: 4 },
              { month: 'Apr', count: 3 },
              { month: 'May', count: 5 }
            ]
          },
          error: null
        };
      }
      return { data: mockDb.getPlatformStats(), error: null };
    }
  },

  timeline: {
    list: async () => {
      if (realSupabase) {
        return { data: mockDb.getTimeline(), error: null };
      }
      return { data: mockDb.getTimeline(), error: null };
    }
  }
};

// === ADMIN NAMESPACE ===
db.admin = {
  getAllUsers: async () => {
    if (realSupabase) {
      const { data: profiles, error } = await realSupabase.from('profiles').select('*, trips(id)');
      if (error) return { data: null, error };
      const mapped = profiles.map(p => ({
        ...p,
        trips_count: (p.trips || []).length
      }));
      return { data: mapped, error: null };
    }
    return { data: mockDb.getAllUsers(), error: null };
  },

  getPopularCities: async () => {
    if (realSupabase) {
      const { data: stops, error } = await realSupabase
        .from('trip_stops')
        .select('destination_id, destinations(name, country, image_url)');
      if (error) return { data: null, error };

      const counts = {};
      stops.forEach(s => {
        const id = s.destination_id;
        if (!counts[id]) {
          counts[id] = {
            id,
            name: s.destinations?.name || 'Unknown',
            country: s.destinations?.country || 'Global',
            image_url: s.destinations?.image_url,
            count: 0
          };
        }
        counts[id].count += 1;
      });

      const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
      return { data: sorted, error: null };
    }
    return { data: mockDb.getPopularCities(), error: null };
  },

  getPopularActivities: async () => {
    if (realSupabase) {
      const { data: items, error } = await realSupabase
        .from('itinerary_items')
        .select('activity_name, cost');
      if (error) return { data: null, error };

      const counts = {};
      items.forEach(i => {
        const name = i.activity_name;
        if (!counts[name]) {
          counts[name] = { name, count: 0, cost: i.cost || 0, category: 'Activities' };
        }
        counts[name].count += 1;
      });

      const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
      return { data: sorted, error: null };
    }
    return { data: mockDb.getPopularActivities(), error: null };
  },

  getPlatformStats: async () => {
    if (realSupabase) {
      const { data: profiles } = await realSupabase.from('profiles').select('id');
      const { data: trips } = await realSupabase.from('trips').select('budget, start_date, end_date');
      const { data: expenses } = await realSupabase.from('expenses').select('amount');

      const totalUsers = (profiles || []).length || 1;
      const totalTrips = (trips || []).length || 1;
      const totalBudget = (trips || []).reduce((a, c) => a + Number(c.budget || 0), 0);
      const avgBudget = Math.round(totalBudget / totalTrips);
      const totalExpenses = (expenses || []).reduce((a, c) => a + Number(c.amount || 0), 0);

      const now = new Date();
      let ongoing = 0, upcoming = 0, completed = 0;
      (trips || []).forEach(t => {
        const s = new Date(t.start_date);
        const e = new Date(t.end_date);
        if (now >= s && now <= e) ongoing++;
        else if (now < s) upcoming++;
        else completed++;
      });

      return {
        data: {
          totalUsers,
          totalTrips,
          avgBudget,
          totalExpenses,
          statusBreakdown: { ongoing, upcoming, completed },
          tripsOverTime: [
            { month: 'Jan', count: 1 },
            { month: 'Feb', count: 2 },
            { month: 'Mar', count: 4 },
            { month: 'Apr', count: 3 },
            { month: 'May', count: 5 }
          ]
        },
        error: null
      };
    }
    return { data: mockDb.getPlatformStats(), error: null };
  }
};

