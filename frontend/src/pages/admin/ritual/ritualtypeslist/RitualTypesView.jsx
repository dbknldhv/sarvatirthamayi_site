import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ritualTypesService } from "../../../../services/ritualTypesService";

export default function RitualTypesView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ritualTypesService.getRitualTypeById(id)
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-10 text-center font-bold text-slate-400">Loading details...</div>;
  if (!data) return <div className="p-10 text-center font-bold text-rose-500">Ritual Type not found.</div>;

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl p-10 shadow-sm border border-slate-100 max-w-4xl">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-xl font-bold text-slate-700">Ritual Type Details</h2>
          <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black ${data.status === 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
            {data.status === 1 ? 'ACTIVE' : 'INACTIVE'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Type Name</p>
            <p className="text-lg font-bold text-slate-600">{data.name}</p>
          </div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Database ID</p>
            <p className="text-sm font-mono text-slate-500">{data._id}</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
          <button 
            onClick={() => navigate(`/admin/ritual/type/edit/${id}`)} 
            className="bg-indigo-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-indigo-100"
          >
            Edit This Type
          </button>
          <button 
            onClick={() => navigate("/admin/ritual/type")} 
            className="bg-slate-100 text-slate-600 px-10 py-3 rounded-xl font-bold"
          >
            Back to List
          </button>
        </div>
      </div>
    </div>
  );
}