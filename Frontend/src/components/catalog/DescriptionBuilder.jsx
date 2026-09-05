import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

const COMMON_ICONS = [
    'Info', 'Star', 'Monitor', 'Smartphone', 'Battery', 'Cpu', 'Camera', 
    'Wifi', 'Bluetooth', 'Shirt', 'Watch', 'Headphones', 'Zap', 'Shield',
    'Truck', 'Box', 'Droplet', 'Wind', 'Sun', 'Moon', 'Heart'
];

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
        const newSections = [...sections, { heading: '', icon: 'Info', content: '' }];
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
                const IconComponent = LucideIcons[section.icon] || LucideIcons.Info;
                return (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative">
                        {sections.length > 1 && (
                            <button
                                type="button"
                                onClick={() => removeSection(index)}
                                className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3 pr-6">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Heading</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Display"
                                    value={section.heading}
                                    onChange={(e) => updateSection(index, 'heading', e.target.value)}
                                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Icon</label>
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-white rounded border border-gray-200">
                                        <IconComponent className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <select
                                        value={section.icon}
                                        onChange={(e) => updateSection(index, 'icon', e.target.value)}
                                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                                    >
                                        {COMMON_ICONS.map(iconName => (
                                            <option key={iconName} value={iconName}>{iconName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
                            <textarea
                                rows={3}
                                value={section.content}
                                onChange={(e) => updateSection(index, 'content', e.target.value)}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                                placeholder="Describe this section..."
                            />
                        </div>
                    </div>
                );
            })}
            <button
                type="button"
                onClick={addSection}
                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
            >
                <Plus className="w-4 h-4" />
                Add Description Section
            </button>
        </div>
    );
}
