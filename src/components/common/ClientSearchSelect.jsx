import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X, ChevronDown, Search } from "lucide-react";

export default function ClientSearchSelect({ clients = [], value, onChange, placeholder = "Search or select client..." }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedClient = clients.find(c => c.id === value);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = clients.filter(c =>
    c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (client) => {
    onChange(client.id);
    setSearch('');
    setOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange(null);
    setSearch('');
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <div
        className="flex items-center h-12 px-3 border border-input rounded-md bg-white cursor-pointer hover:border-purple-400 transition-colors gap-2"
        onClick={() => setOpen(!open)}
      >
        {selectedClient ? (
          <>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{selectedClient.full_name?.charAt(0)}</span>
            </div>
            <span className="flex-1 font-medium text-gray-900 text-sm truncate">{selectedClient.full_name}</span>
            {selectedClient.food_preference && (
              <Badge variant="outline" className="text-xs capitalize hidden sm:inline-flex">{selectedClient.food_preference}</Badge>
            )}
            <button onClick={handleClear} className="ml-1 text-gray-400 hover:text-red-500 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </>
        ) : (
          <>
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="flex-1 text-gray-400 text-sm">{placeholder}</span>
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          </>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl">
          <div className="p-2 border-b">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-md">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                className="flex-1 text-sm bg-transparent outline-none placeholder:text-gray-400"
                placeholder="Type to search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-sm text-gray-500 text-center">No clients found</p>
            ) : (
              filtered.map(client => (
                <button
                  key={client.id}
                  className={`w-full text-left px-4 py-2.5 hover:bg-purple-50 flex items-center gap-3 transition-colors ${value === client.id ? 'bg-purple-50' : ''}`}
                  onClick={() => handleSelect(client)}
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{client.full_name?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{client.full_name}</p>
                    {client.email && <p className="text-xs text-gray-500 truncate">{client.email}</p>}
                  </div>
                  {client.food_preference && (
                    <Badge variant="outline" className="text-xs capitalize flex-shrink-0">{client.food_preference}</Badge>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}