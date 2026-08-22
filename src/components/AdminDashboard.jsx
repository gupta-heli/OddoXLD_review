import React, { useEffect, useState } from 'react';
import { db } from '../db/supabaseClient';
import { 
  Users, 
  MapPin, 
  Compass, 
  DollarSign, 
  TrendingUp, 
  ShieldCheck, 
  BookOpen, 
  Activity, 
  Eye
} from 'lucide-react';

export default function AdminDashboard({ activeUser, onNavigate, onSelectTrip }) {
  const [stats, setStats] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [popularCities, setPopularCities] = useState([]);
  const [popularActivities, setPopularActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserTrips, setSelectedUserTrips] = useState(null);
  const [inspectingUser, setInspectingUser] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, [activeUser]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, citiesRes, actsRes] = await Promise.all([
        db.admin.getPlatformStats(),
        db.admin.getAllUsers(),
        db.admin.getPopularCities(),
        db.admin.getPopularActivities()
      ]);

      if (statsRes.data) setStats(statsRes.data);
      if (usersRes.data) setUsersList(usersRes.data);
      if (citiesRes.data) setPopularCities(citiesRes.data);
      if (actsRes.data) setPopularActivities(actsRes.data);
    } catch (err) {
      console.error('Error loading admin analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectUserTrips = (user) => {
    setInspectingUser(user);
    setSelectedUserTrips(user.trips || []);
  };

  // Hand-rolled SVG Donut Chart for Trip Statuses
  const renderStatusDonutChart = () => {
    if (!stats || !stats.statusBreakdown) return null;
    const { ongoing = 0, upcoming = 0, completed = 0 } = stats.statusBreakdown;
    const total = (ongoing + upcoming + completed) || 1;

    const slices = [
      { name: 'Ongoing', count: ongoing, color: 'var(--magenta)' },
      { name: 'Upcoming', count: upcoming, color: 'var(--teal)' },
      { name: 'Completed', count: completed, color: 'var(--mustard)' }
    ];

    const radius = 35;
    const circ = 2 * Math.PI * radius;
    let accumulatedPercent = 0;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <svg width="140" height="140" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="transparent" stroke="#38373D" strokeWidth="12" />
          {slices.map((slice) => {
            const pct = slice.count / total;
            const strokeLength = pct * circ;
            const strokeOffset = circ - (accumulatedPercent * circ);
            accumulatedPercent += pct;

            if (strokeLength <= 0) return null;

            return (
              <circle
                key={slice.name}
                cx="50"
                cy="50"
                r={radius}
                fill="transparent"
                stroke={slice.color}
                strokeWidth="12"
                strokeDasharray={`${strokeLength} ${circ}`}
                strokeDashoffset={strokeOffset}
                transform="rotate(-90 50 50)"
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            );
          })}
          <text x="50%" y="46%" dominantBaseline="middle" textAnchor="middle" fill="#A8A2A8" fontSize="6" fontFamily="'Space Mono', monospace">
            TRIPS
          </text>
          <text x="50%" y="58%" dominantBaseline="middle" textAnchor="middle" fill="#F3EEF1" fontSize="10" fontWeight="bold" fontFamily="'Space Mono', monospace">
            {total}
          </text>
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
          {slices.map((s) => (
            <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: s.color }} />
              <span style={{ color: 'var(--muted)' }}>{s.name}:</span>
              <strong style={{ color: 'var(--off-white)' }}>{s.count}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Hand-rolled SVG Bar Chart for Trips Over Time
  const renderTripsBarChart = () => {
    if (!stats || !stats.tripsOverTime) return null;
    const data = stats.tripsOverTime;
    const maxVal = Math.max(...data.map(d => d.count), 1);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', height: '120px', borderBottom: '1px solid var(--border)', paddingBottom: '8px', paddingLeft: '8px', paddingRight: '8px', gap: '12px' }}>
          {data.map((d, i) => {
            const heightPct = Math.round((d.count / maxVal) * 100);
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'var(--mustard)' }}>
                  {d.count}
                </span>
                <div
                  style={{
                    width: '100%',
                    backgroundColor: 'var(--teal)',
                    borderRadius: '4px 4px 0 0',
                    height: `${Math.max(heightPct, 12)}%`,
                    transition: 'all 0.3s ease'
                  }}
                />
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 8px', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)' }}>
          {data.map((d, i) => (
            <span key={i}>{d.month}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Editorial Header */}
      <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--magenta)', letterSpacing: '0.15em' }}>
            PLATFORM_INTELLIGENCE // ADMIN_ANALYTICS
          </span>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 800, color: 'var(--off-white)', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
            Admin Dashboard & Analytics
            <span style={{ backgroundColor: 'rgba(201, 79, 130, 0.15)', border: '1px solid var(--magenta)', color: 'var(--magenta)', fontSize: '0.7rem', fontFamily: 'var(--font-mono)', padding: '4px 10px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} /> ADMIN_ONLY
            </span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Global platform aggregates, cross-user trend metrics, destination popularity, and user management.
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          SYNCHRONIZING_PLATFORM_INTELLIGENCE // LOADING
        </div>
      ) : (
        <>
          {/* Top Platform Metrics Cards (4 Column Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            <div className="editorial-card dark" style={{ padding: '18px 20px', borderLeft: '4px solid var(--magenta)', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(201, 79, 130, 0.15)', color: 'var(--magenta)', padding: '10px', borderRadius: '10px' }}>
                <Users size={22} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)' }}>TOTAL USERS</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--off-white)' }}>{stats?.totalUsers || 0}</div>
              </div>
            </div>

            <div className="editorial-card dark" style={{ padding: '18px 20px', borderLeft: '4px solid var(--teal)', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(72, 183, 176, 0.15)', color: 'var(--teal)', padding: '10px', borderRadius: '10px' }}>
                <Compass size={22} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)' }}>TOTAL TRIPS</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--off-white)' }}>{stats?.totalTrips || 0}</div>
              </div>
            </div>

            <div className="editorial-card dark" style={{ padding: '18px 20px', borderLeft: '4px solid var(--mustard)', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(230, 184, 61, 0.15)', color: 'var(--mustard)', padding: '10px', borderRadius: '10px' }}>
                <DollarSign size={22} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)' }}>AVG TRIP BUDGET</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--mustard)' }}>₹{(stats?.avgBudget || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>

            <div className="editorial-card dark" style={{ padding: '18px 20px', borderLeft: '4px solid var(--coral)', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ backgroundColor: 'rgba(232, 121, 112, 0.15)', color: 'var(--coral)', padding: '10px', borderRadius: '10px' }}>
                <TrendingUp size={22} />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--muted)' }}>PLATFORM SPEND</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.3rem', fontWeight: 'bold', color: 'var(--off-white)' }}>₹{(stats?.totalExpenses || 0).toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* User Trends & Analytics Section (2 Column Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Status Donut Chart */}
            <div className="editorial-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--off-white)' }}>Trip Status Breakdown</h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--teal)', letterSpacing: '0.1em' }}>LIVE_DISTRIBUTION</span>
              </div>
              {renderStatusDonutChart()}
            </div>

            {/* Trips Created Over Time Bar Chart */}
            <div className="editorial-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700, color: 'var(--off-white)' }}>Trips Created Over Time</h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--magenta)', letterSpacing: '0.1em' }}>MONTHLY_GROWTH</span>
              </div>
              {renderTripsBarChart()}
            </div>
          </div>

          {/* Manage Users Section */}
          <div className="editorial-card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '14px', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 700, color: 'var(--off-white)' }}>Manage Users</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>Platform accounts registry and trip logs</p>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--mustard)' }}>{usersList.length} REGISTERED</span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    <th style={{ padding: '12px 14px', textAlign: 'left' }}>USER</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left' }}>COUNTRY</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left' }}>ROLE</th>
                    <th style={{ padding: '12px 14px', textAlign: 'left' }}>TRIPS CREATED</th>
                    <th style={{ padding: '12px 14px', textAlign: 'right' }}>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img 
                            src={u.avatar_url || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&h=80&q=80"} 
                            alt={u.full_name} 
                            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} 
                          />
                          <div>
                            <div style={{ fontWeight: 'bold', color: 'var(--off-white)', fontSize: '0.85rem' }}>{u.full_name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{u.email || u.id}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{u.country || 'Global'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        {u.is_admin ? (
                          <span style={{ backgroundColor: 'rgba(201, 79, 130, 0.15)', border: '1px solid var(--magenta)', color: 'var(--magenta)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>ADMIN</span>
                        ) : (
                          <span style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border)', color: 'var(--muted)', padding: '3px 8px', borderRadius: '4px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>MEMBER</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--mustard)' }}>{u.trips_count || 0} Trips</td>
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          className="btn btn-secondary"
                          style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => handleInspectUserTrips(u)}
                        >
                          <Eye size={13} /> View Trips
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Inspected User Trips Modal */}
          {inspectingUser && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '20px' }}>
              <div className="editorial-card" style={{ width: '100%', maxWidth: '650px', maxHeight: '80vh', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--magenta)' }}>USER_JOURNEY_INSPECTION //</span>
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: 'var(--off-white)', fontWeight: 'bold' }}>{inspectingUser.full_name}'s Trips</h3>
                  </div>
                  <button 
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                    onClick={() => setInspectingUser(null)}
                  >
                    Close
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedUserTrips && selectedUserTrips.length > 0 ? (
                    selectedUserTrips.map((t) => (
                      <div key={t.id} style={{ backgroundColor: 'var(--primary-dark)', border: '1px solid var(--border)', padding: '16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <h4 style={{ fontWeight: 'bold', color: 'var(--off-white)', fontSize: '0.9rem' }}>{t.name}</h4>
                          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '2px' }}>{t.description}</p>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--teal)', display: 'block', marginTop: '4px' }}>
                            {t.start_date} → {t.end_date} • ₹{Number(t.budget).toLocaleString('en-IN')}
                          </span>
                        </div>
                        <button
                          className="btn btn-primary"
                          style={{ fontSize: '0.75rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => {
                            setInspectingUser(null);
                            onSelectTrip(t.id);
                            onNavigate('itinerary-view');
                          }}
                        >
                          <BookOpen size={13} /> View
                        </button>
                      </div>
                    ))
                  ) : (
                    <p style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', padding: '24px 0', textAlign: 'center', fontStyle: 'italic' }}>
                      NO_TRIPS_LOGGED_FOR_THIS_USER //
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Popular Cities & Activities Row (2 Column Grid) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {/* Popular Cities */}
            <div className="editorial-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--off-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} style={{ color: 'var(--magenta)' }} /> Popular Destinations
                </h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--muted)' }}>MOST_BOOKED_STOPS</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {popularCities.slice(0, 5).map((city, idx) => (
                  <div key={city.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: 'var(--primary-dark)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--magenta)', width: '20px' }}>
                        #{idx + 1}
                      </span>
                      {city.image_url && (
                        <img src={city.image_url} alt={city.name} style={{ width: '32px', height: '32px', borderRadius: '6px', objectFit: 'cover' }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--off-white)' }}>{city.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{city.country}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--mustard)', fontWeight: 'bold' }}>
                      {city.count} {city.count === 1 ? 'Trip' : 'Trips'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Activities */}
            <div className="editorial-card" style={{ padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '12px', marginBottom: '16px' }}>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: 'var(--off-white)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={18} style={{ color: 'var(--teal)' }} /> Popular Activities
                </h3>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--muted)' }}>MOST_BOOKED_EXPERIENCES</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {popularActivities.slice(0, 5).map((act, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', backgroundColor: 'var(--primary-dark)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--teal)', width: '20px' }}>
                        #{idx + 1}
                      </span>
                      <div>
                        <div style={{ fontWeight: 'bold', color: 'var(--off-white)' }}>{act.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>{act.category} • ₹{Number(act.cost || 0).toLocaleString('en-IN')}</div>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--teal)', fontWeight: 'bold' }}>
                      {act.count} Bookings
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
