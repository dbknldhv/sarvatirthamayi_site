import React, { useEffect, useState } from 'react';
import api from '../../../api/api';
import { Download, Calendar, MapPin, Loader2, Ticket } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MyBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const res = await api.get('/user/my-temple-bookings');
                setBookings(res.data.data);
            } catch (err) {
                toast.error("Could not load booking history");
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    const downloadTicket = (path) => {
        const baseUrl = import.meta.env.VITE_API_URL.replace(/\/$/, "");
        window.open(`${baseUrl}${path}`, "_blank");
    };

    if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-purple-600" /></div>;

    return (
        <div className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
                <Ticket className="text-purple-600" /> My Sacred Visits
            </h2>

            {bookings.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl text-center border-2 border-dashed border-slate-200 dark:border-slate-800">
                    <p className="opacity-60">No bookings found yet.</p>
                </div>
            ) : (
                bookings.map((booking) => (
                    <div key={booking._id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-4 w-full">
                            <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-600">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold">{booking.temple_id?.name || 'Temple Visit'}</h3>
                                <p className="text-sm opacity-60 flex items-center gap-1">
                                    <MapPin size={12} /> {new Date(booking.date).toDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <span className={`text-xs px-3 py-1 rounded-full font-bold ${booking.payment_status === 2 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                {booking.payment_status === 2 ? 'Confirmed' : 'Pending'}
                            </span>
                            
                            {booking.ticket_url && (
                                <button 
                                    onClick={() => downloadTicket(booking.ticket_url)}
                                    className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    title="Download Ticket"
                                >
                                    <Download size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}