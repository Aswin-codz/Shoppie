import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Search, X, Check, ChevronDown } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export const POPULAR_ICONS = [
    'Info', 'Sparkles', 'Star', 'Shield', 'ShieldCheck', 'Award', 'BadgeCheck', 'CheckCircle2',
    'Truck', 'Box', 'Package', 'Clock', 'Coins', 'Tag', 'ShoppingBag', 'ShoppingCart',
    'Smartphone', 'Tablet', 'Laptop', 'Monitor', 'Tv', 'Cpu', 'HardDrive', 'Battery', 'BatteryCharging',
    'Wifi', 'Bluetooth', 'Camera', 'Headphones', 'Speaker', 'Mic', 'Watch', 'Zap', 'Activity', 'Gauge',
    'Heart', 'Crown', 'Gem', 'Gift', 'Shirt', 'Flame', 'Feather', 'Leaf', 'Sun', 'Moon',
    'Droplet', 'Droplets', 'Wind', 'Umbrella', 'Coffee', 'Music', 'Video', 'Volume2',
    'Wrench', 'Settings', 'Layers', 'Sliders', 'Key', 'Lock', 'Unlock', 'Eye', 'Glasses',
    'BookOpen', 'FileText', 'HelpCircle', 'Bell', 'MapPin', 'Globe', 'Mail', 'Phone',
    'Target', 'Navigation', 'Send', 'ThumbsUp', 'RefreshCw', 'RotateCcw', 'Bookmark'
];

/**
 * Responsive, searchable icon picker dropdown/popover for product heading icons.
 */
function IconPicker({ selectedIcon, onSelect }) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef(null);

    const CurrentIconComponent = LucideIcons[selectedIcon] || LucideIcons.Info;

    const filteredIcons = POPULAR_ICONS.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase().trim())
    );

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-xs hover:border-indigo-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition text-left"
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md shrink-0 flex items-center justify-center">
                        <CurrentIconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                        {selectedIcon || 'Select Icon'}
                    </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''}`} />
            </button>

            {/* Dropdown Popover */}
            {isOpen && (
                <div className="absolute left-0 sm:left-auto right-0 mt-1.5 w-full sm:w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 p-2.5 space-y-2 animate-in fade-in duration-150">
                    {/* Search bar */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search icons (e.g. shield, battery, star)..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                            className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-gray-300 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden transition"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch('')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Quick Count & Hint */}
                    <div className="flex items-center justify-between text-[11px] text-gray-500 px-1">
                        <span>{filteredIcons.length} icon{filteredIcons.length === 1 ? '' : 's'} available</span>
                        {search && <span className="text-indigo-600 font-medium">Filtering by "{search}"</span>}
                    </div>

                    {/* Scrollable Icon Grid */}
                    <div className="max-h-56 overflow-y-auto grid grid-cols-4 sm:grid-cols-5 gap-1.5 p-1 rounded-lg bg-gray-50/70 border border-gray-100">
                        {filteredIcons.length > 0 ? (
                            filteredIcons.map((iconName) => {
                                const IconComp = LucideIcons[iconName] || LucideIcons.HelpCircle;
                                const isSelected = selectedIcon === iconName;
                                return (
                                    <button
                                        key={iconName}
                                        type="button"
                                        title={iconName}
                                        onClick={() => {
                                            onSelect(iconName);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`flex flex-col items-center justify-center p-2 rounded-lg text-center transition group relative ${
                                            isSelected
                                                ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                                                : 'bg-white text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200/60'
                                        }`}
                                    >
                                        <IconComp className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'group-hover:scale-110 transition-transform'}`} />
                                        <span className={`text-[10px] mt-1 truncate max-w-full leading-tight ${isSelected ? 'text-indigo-100' : 'text-gray-500 group-hover:text-indigo-600'}`}>
                                            {iconName}
                                        </span>
                                        {isSelected && (
                                            <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white" />
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className="col-span-full py-6 text-center text-xs text-gray-400">
                                No icons found matching "{search}"
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function DescriptionBuilder({ description, onChange }) {
    let sections = [];
    try {
        if (typeof description === 'string' && description.startsWith('[')) {
            sections = JSON.parse(description);
        } else {
            sections = [{ heading: '', icon: 'Info', content: description || '' }];
        }
    } catch (e) {
        sections = [{ heading: '', icon: 'Info', content: description || '' }];
    }

    const updateSection = (index, field, value) => {
        const newSections = [...sections];
        newSections[index][field] = value;
        onChange(JSON.stringify(newSections));
    };

    const addSection = () => {
        const newSections = [...sections, { heading: '', icon: 'Sparkles', content: '' }];
        onChange(JSON.stringify(newSections));
    };

    const removeSection = (index) => {
        if (sections.length === 1) return; // keep at least one
        const newSections = sections.filter((_, i) => i !== index);
        onChange(JSON.stringify(newSections));
    };

    return (
        <div className="space-y-4">
            {sections.map((section, index) => {
                return (
                    <div
                        key={index}
                        className="p-4 sm:p-5 border border-gray-200 rounded-xl bg-gray-50/80 relative shadow-xs transition hover:border-gray-300"
                    >
                        {sections.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeSection(index)}
                                title="Remove section"
                                className="absolute top-3 right-3 text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3.5 pr-8">
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Section Heading
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Display & Screen, Battery Life, Warranty"
                                    value={section.heading}
                                    onChange={(e) => updateSection(index, 'heading', e.target.value)}
                                    className="block w-full rounded-lg border border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm px-3 py-2 bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                    Heading Icon (Searchable)
                                </label>
                                <IconPicker
                                    selectedIcon={section.icon || 'Info'}
                                    onSelect={(icon) => updateSection(index, 'icon', icon)}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                Section Description & Details
                            </label>
                            <textarea
                                rows={3}
                                value={section.content}
                                onChange={(e) => updateSection(index, 'content', e.target.value)}
                                className="block w-full rounded-lg border border-gray-300 shadow-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm px-3 py-2 bg-white"
                                placeholder="Write clear specifications, features, and key benefits for this section..."
                            />
                        </div>
                    </div>
                );
            })}
            <button
                type="button"
                onClick={addSection}
                className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm font-semibold text-indigo-600 hover:border-indigo-500 hover:bg-indigo-50/50 transition flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Heading & Feature Section
            </button>
        </div>
    );
}
