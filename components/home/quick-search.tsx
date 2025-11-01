"use client"

import { CalendarIcon, Users, ChevronDown, Bed } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar } from "@/components/ui/calendar";
import { format, addDays, isAfter } from "date-fns";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Room = { id: string; name: string; quantity?: number; capacity?: number }

export function QuickSearch() {
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [showCheckInCal, setShowCheckInCal] = useState(false);
  const [showCheckOutCal, setShowCheckOutCal] = useState(false);
  const [guests, setGuests] = useState({ rooms: 1, adults: 1, children: 0 });
  const [showGuestDropdown, setShowGuestDropdown] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [showRoomDropdown, setShowRoomDropdown] = useState(false);
  const [errors, setErrors] = useState<{checkIn?: boolean; checkOut?: boolean; room?: boolean}>({});
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Load rooms from Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "rooms"), (snap) => {
      const list = snap.docs.map((d) => {
        const data = d.data();
        return { id: d.id, name: data.name, quantity: data.quantity || 1, capacity: data.capacity || 2 };
      });
      setRooms(list);
      if (!selectedRoomId && list.length > 0) {
        setSelectedRoomId(list[0].id);
      }
    });
    return () => unsub();
  }, []);

  // Close popups when clicking outside
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapperRef.current) return;
      const target = e.target as Node;
      if (!wrapperRef.current.contains(target)) {
        setShowCheckInCal(false);
        setShowCheckOutCal(false);
        setShowGuestDropdown(false);
        setShowRoomDropdown(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectedRoom = rooms.find(r => r.id === selectedRoomId);

  const handleBookNow = () => {
    const newErrors: {checkIn?: boolean; checkOut?: boolean; room?: boolean} = {};
    let hasErrors = false;

    if (!checkIn) {
      newErrors.checkIn = true;
      hasErrors = true;
    }
    if (!checkOut) {
      newErrors.checkOut = true;
      hasErrors = true;
    }
    if (!selectedRoomId) {
      newErrors.room = true;
      hasErrors = true;
    }

    if (hasErrors) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    const params = new URLSearchParams();
    if (checkIn) params.set("checkIn", checkIn.toISOString().slice(0, 10));
    if (checkOut) params.set("checkOut", checkOut.toISOString().slice(0, 10));
    params.set("rooms", String(guests.rooms));
    params.set("adults", String(guests.adults));
    params.set("children", String(guests.children));
    if (selectedRoomId) params.set("roomId", selectedRoomId);
    router.push(`/booking?${params.toString()}`);
  };

  return (
    <section className="bg-background px-0">
      <div className="max-w-6xl mx-auto w-full">
        <div ref={wrapperRef} className="bg-white border border-border shadow-lg rounded-lg flex flex-col md:flex-row items-center gap-2 md:gap-6 px-2 md:px-6 py-3 md:py-5 min-h-[84px] mt-6 relative z-10">
          {/* Check-In */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Check-In Date</label>
            <div className="relative">
              <button
                className={`flex items-center w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent text-left bg-white ${
                  errors.checkIn ? "border-red-500 border-2" : "border-border"
                }`}
                type="button"
                onClick={() => { 
                  setShowCheckInCal((v) => !v); 
                  setShowCheckOutCal(false);
                  setShowGuestDropdown(false);
                  setShowRoomDropdown(false);
                  if (errors.checkIn) setErrors(prev => ({ ...prev, checkIn: false }));
                }}
              >
                <CalendarIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                <span className={checkIn ? "text-foreground" : "text-muted-foreground"}>
                  {checkIn ? format(checkIn, "dd/MM/yyyy") : "Select date"}
                </span>
              </button>
              {showCheckInCal && (
                <div className="absolute top-12 left-0 z-20 bg-white p-2 rounded-lg shadow-lg border w-fit" tabIndex={0}>
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={date => { 
                      setCheckIn(date); 
                      setShowCheckInCal(false);
                      if (errors.checkIn) setErrors(prev => ({ ...prev, checkIn: false }));
                    }}
                    showOutsideDays
                    defaultMonth={checkIn ?? today}
                    disabled={{ before: today }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Check-Out */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Check-Out Date</label>
            <div className="relative">
              <button
                className={`flex items-center w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent text-left bg-white ${
                  errors.checkOut ? "border-red-500 border-2" : "border-border"
                }`}
                type="button"
                onClick={() => { 
                  setShowCheckOutCal((v) => !v); 
                  setShowCheckInCal(false);
                  setShowGuestDropdown(false);
                  setShowRoomDropdown(false);
                  if (errors.checkOut) setErrors(prev => ({ ...prev, checkOut: false }));
                }}
              >
                <CalendarIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                <span className={checkOut ? "text-foreground" : "text-muted-foreground"}>
                  {checkOut ? format(checkOut, "dd/MM/yyyy") : "Select date"}
                </span>
              </button>
              {showCheckOutCal && (
                <div className="absolute top-12 left-0 z-20 bg-white p-2 rounded-lg shadow-lg border w-fit" tabIndex={0}>
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={date => {
                      if (!checkIn) {
                        alert("Please select check-in date first");
                        return;
                      }
                      if (date && !isAfter(date, checkIn)) {
                        alert("Check-out must be after check-in date");
                        return;
                      }
                      setCheckOut(date);
                      setShowCheckOutCal(false);
                      if (errors.checkOut) setErrors(prev => ({ ...prev, checkOut: false }));
                    }}
                    showOutsideDays
                    defaultMonth={checkOut ?? (checkIn ? addDays(checkIn, 1) : today)}
                    disabled={checkIn ? { before: addDays(checkIn, 1) } : { before: today }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Room Selection */}
          <div className="flex-1 min-w-[200px] relative">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Available Room</label>
            <button
              type="button"
              className={`flex items-center w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent bg-white ${
                errors.room ? "border-red-500 border-2" : "border-border"
              }`}
              onClick={() => {
                setShowRoomDropdown(v => !v);
                setShowCheckInCal(false);
                setShowCheckOutCal(false);
                setShowGuestDropdown(false);
                if (errors.room) setErrors(prev => ({ ...prev, room: false }));
              }}
            >
              <Bed className="w-4 h-4 mr-2 opacity-60" />
              <span className="flex-1 text-left">
                {selectedRoom ? selectedRoom.name : "Select room"}
              </span>
              <ChevronDown className="w-4 h-4 opacity-40" />
            </button>
            {showRoomDropdown && (
              <div className="absolute top-12 left-0 right-0 min-w-[200px] p-2 rounded-lg bg-white shadow-lg border z-20 max-h-60 overflow-y-auto">
                {rooms.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">No rooms available</div>
                ) : (
                  rooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      className={`w-full text-left px-3 py-2 rounded hover:bg-muted transition-colors ${
                        selectedRoomId === room.id ? "bg-accent text-accent-foreground" : ""
                      }`}
                      onClick={() => {
                        setSelectedRoomId(room.id);
                        setShowRoomDropdown(false);
                      }}
                    >
                      {room.name} {room.capacity && `(${room.capacity} guests)`}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Guests */}
          <div className="flex-1 min-w-[200px] relative">
            <label className="block text-xs font-medium text-muted-foreground mb-1">Guests</label>
            <button
              type="button"
              className="flex items-center w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-accent bg-white"
              onClick={() => {
                setShowGuestDropdown(v => !v);
                setShowCheckInCal(false);
                setShowCheckOutCal(false);
                setShowRoomDropdown(false);
              }}
            >
              <span className="font-semibold text-lg mr-0.5">{guests.rooms}</span> <span className="text-xs mr-2">ROOMS</span>
              <span className="font-semibold text-lg mr-0.5">{guests.adults}</span> <span className="text-xs mr-2">ADULTS</span>
              <span className="font-semibold text-lg mr-0.5">{guests.children}</span> <span className="text-xs">CHILDREN</span>
              <Users className="w-4 h-4 ml-auto opacity-60" />
              <ChevronDown className="w-4 h-4 ml-2 opacity-40" />
            </button>
            {showGuestDropdown && (
              <div className="absolute top-12 left-0 min-w-[210px] p-4 rounded-lg bg-white shadow-lg border z-20" tabIndex={0}>
                {[{"label":"Rooms","attr":"rooms"},{"label":"Adults","attr":"adults"},{"label":"Children","attr":"children"}].map(item => (
                  <div key={item.attr} className="flex items-center justify-between mb-2">
                    <span className="text-sm text-foreground">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="w-7 h-7 rounded-full bg-muted text-lg text-foreground"
                        onClick={() => setGuests(g => ({ ...g, [item.attr]: Math.max((g as any)[item.attr]-1, item.attr==="adults"?1:0) }))}
                        aria-label="decrement"
                      >-</button>
                      <span className="w-5 text-center">{guests[item.attr]}</span>
                      <button
                        type="button"
                        className="w-7 h-7 rounded-full bg-accent text-accent-foreground text-lg"
                        onClick={() => setGuests(g => ({ ...g, [item.attr]: (g as any)[item.attr]+1 }))}
                        aria-label="increment"
                      >+</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Book Now Button */}
          <div className="flex items-end min-w-[160px] w-full md:w-auto">
            <button
              className="w-full md:w-[140px] h-12 bg-black text-white rounded font-semibold tracking-widest text-base transition hover:bg-gray-900 shadow-lg"
              onClick={handleBookNow}
            >
              BOOK NOW
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
