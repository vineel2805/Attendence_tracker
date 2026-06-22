/**
 * TimetableEditablePreview - Editable table view of parsed timetable
 * Allows users to correct OCR mistakes before saving to Firebase
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Check,
  X,
  Plus,
  Trash2,
  AlertTriangle,
  Edit2,
  Save,
} from 'lucide-react';
import { Button } from './Button';
import { DayId, SubjectV2, ClassEntry } from '@/types';
import { validateSubjectName, isValidSubjectName } from '@/utils/timetableParser';

/**
 * Editable data structure used during preview/editing
 */
export interface EditableTimetableData {
  days: Record<DayId, { totalPeriods: number }>;
  timetable: Record<DayId, string[]>; // Subject names per period
  subjects: string[];
}

/**
 * Final output format for saving to Firebase
 */
export interface FinalTimetableData {
  days: Record<DayId, { totalPeriods: number }>;
  subjects: SubjectV2[];
  timetable: Record<DayId, ClassEntry[]>;
}

interface TimetableEditablePreviewProps {
  data: EditableTimetableData;
  existingSubjects: SubjectV2[];
  onConfirm: (finalData: FinalTimetableData) => void;
  onCancel: () => void;
  parseConfidence: number;
}

// Day ordering for display
const DAY_ORDER: DayId[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Full day labels
const DAY_LABELS: Record<DayId, string> = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
};

export const TimetableEditablePreview: React.FC<TimetableEditablePreviewProps> = ({
  data,
  existingSubjects,
  onConfirm,
  onCancel,
  parseConfidence,
}) => {
  // Editable state - deep clone of initial data
  const [editableData, setEditableData] = useState<EditableTimetableData>(() => ({
    days: JSON.parse(JSON.stringify(data.days)),
    timetable: JSON.parse(JSON.stringify(data.timetable)),
    subjects: [...data.subjects],
  }));

  // Track which cell is being edited
  const [editingCell, setEditingCell] = useState<{ day: DayId; period: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Calculate filtered days that have data
  const daysWithData = useMemo(() => {
    return DAY_ORDER.filter(day => editableData.days[day].totalPeriods > 0);
  }, [editableData.days]);

  // Calculate maximum periods across all days
  const maxPeriods = useMemo(() => {
    return Math.max(...Object.values(editableData.days).map(d => d.totalPeriods), 0);
  }, [editableData.days]);

  // Extract all unique subjects from current timetable
  const allSubjects = useMemo(() => {
    const set = new Set<string>();
    Object.values(editableData.timetable).forEach(periods => {
      periods.forEach(subject => {
        if (subject && isValidSubjectName(subject)) {
          set.add(subject);
        }
      });
    });
    return Array.from(set).sort();
  }, [editableData.timetable]);

  // Count new subjects (not in existing)
  const newSubjectsCount = useMemo(() => {
    const existingNames = new Set(existingSubjects.map(s => s.name.toUpperCase()));
    return allSubjects.filter(s => !existingNames.has(s.toUpperCase())).length;
  }, [allSubjects, existingSubjects]);

  // Start editing a cell
  const startEditing = (day: DayId, period: number) => {
    const currentValue = editableData.timetable[day][period] || '';
    setEditingCell({ day, period });
    setEditValue(currentValue);
  };

  // Save the current edit
  const saveEdit = () => {
    if (!editingCell) return;

    const { day, period } = editingCell;
    const newValue = validateSubjectName(editValue);

    setEditableData(prev => {
      const newTimetable = { ...prev.timetable };
      newTimetable[day] = [...prev.timetable[day]];
      newTimetable[day][period] = newValue;
      return { ...prev, timetable: newTimetable };
    });

    setEditingCell(null);
    setEditValue('');
  };

  // Cancel the current edit
  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  // Add a new period to a day
  const addPeriod = (day: DayId) => {
    setEditableData(prev => {
      const newDays = { ...prev.days };
      newDays[day] = { totalPeriods: newDays[day].totalPeriods + 1 };

      const newTimetable = { ...prev.timetable };
      newTimetable[day] = [...prev.timetable[day], ''];

      return { days: newDays, timetable: newTimetable, subjects: prev.subjects };
    });
  };

  // Remove the last period from a day
  const removePeriod = (day: DayId, period: number) => {
    setEditableData(prev => {
      const newDays = { ...prev.days };
      newDays[day] = { totalPeriods: Math.max(0, newDays[day].totalPeriods - 1) };

      const newTimetable = { ...prev.timetable };
      newTimetable[day] = prev.timetable[day].filter((_, i) => i !== period);

      return { days: newDays, timetable: newTimetable, subjects: prev.subjects };
    });
  };

  // Add a new day to the timetable
  const addDay = (day: DayId) => {
    setEditableData(prev => {
      const newDays = { ...prev.days };
      newDays[day] = { totalPeriods: 1 };

      const newTimetable = { ...prev.timetable };
      newTimetable[day] = [''];

      return { days: newDays, timetable: newTimetable, subjects: prev.subjects };
    });
  };

  // Convert editable data to final format and confirm
  const handleConfirm = useCallback(() => {
    // Build subject ID map from existing subjects
    const existingNameMap = new Map(
      existingSubjects.map(s => [s.name.toUpperCase(), s])
    );

    const subjectMap = new Map<string, SubjectV2>();
    const newSubjects: SubjectV2[] = [];

    // Create or reuse subjects for all entries
    allSubjects.forEach(name => {
      const upperName = name.toUpperCase();
      const existing = existingNameMap.get(upperName);

      if (existing) {
        subjectMap.set(upperName, existing);
      } else {
        // Create new subject
        const isLab = name.toLowerCase().includes('lab') ||
                      name.toLowerCase().includes('practical');
        const newSubject: SubjectV2 = {
          id: `subject-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: name,
          type: isLab ? 'lab' : 'theory',
        };
        subjectMap.set(upperName, newSubject);
        newSubjects.push(newSubject);
      }
    });

    // Build final timetable with ClassEntry format (merging consecutive same subjects)
    const finalTimetable: Record<DayId, ClassEntry[]> = {
      Mon: [], Tue: [], Wed: [],
      Thu: [], Fri: [], Sat: [], Sun: [],
    };

    DAY_ORDER.forEach(day => {
      const periods = editableData.timetable[day];
      let currentSubject: string | null = null;
      let startPeriod = 1;
      let duration = 0;

      // Save accumulated entry
      const saveEntry = () => {
        if (currentSubject && duration > 0) {
          const subject = subjectMap.get(currentSubject.toUpperCase());
          if (subject) {
            finalTimetable[day].push({
              id: `class-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              day,
              subjectId: subject.id,
              startPeriod,
              duration,
            });
          }
        }
      };

      periods.forEach((subjectName, index) => {
        const periodNum = index + 1;
        const normalizedName = subjectName?.toUpperCase() || '';
        const isValid = isValidSubjectName(normalizedName);

        if (isValid && normalizedName === currentSubject?.toUpperCase()) {
          // Same subject continues - extend duration
          duration++;
        } else {
          // Different subject - save previous and start new
          saveEntry();

          if (isValid) {
            currentSubject = normalizedName;
            startPeriod = periodNum;
            duration = 1;
          } else {
            currentSubject = null;
            duration = 0;
          }
        }
      });

      // Save last entry
      saveEntry();
    });

    const finalData: FinalTimetableData = {
      days: editableData.days,
      subjects: [...existingSubjects, ...newSubjects],
      timetable: finalTimetable,
    };

    onConfirm(finalData);
  }, [editableData, existingSubjects, allSubjects, onConfirm]);

  // Days without data (available to add)
  const availableDays = DAY_ORDER.filter(day => editableData.days[day].totalPeriods === 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-bg-primary rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Review & Edit Timetable
            </h2>
            <p className="text-xs text-text-muted mt-1">
              Parse confidence: {parseConfidence.toFixed(0)}% | Click cells to edit
            </p>
          </div>
          <button onClick={onCancel} className="p-2 hover:bg-bg-muted rounded-lg">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* Warning Banner */}
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-sm text-text-secondary">
              <p>This will replace your current timetable. Review and correct any OCR mistakes before confirming.</p>
              <p className="mt-1 font-medium">
                {allSubjects.length} subjects found ({newSubjectsCount} new)
              </p>
            </div>
          </div>

          {/* Editable Table */}
          {daysWithData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 bg-bg-muted text-left text-sm font-medium text-text-secondary border border-border">
                      Day / Period
                    </th>
                    {Array.from({ length: maxPeriods }, (_, i) => (
                      <th
                        key={i}
                        className="p-2 bg-bg-muted text-center text-sm font-medium text-text-secondary border border-border min-w-[100px]"
                      >
                        P{i + 1}
                      </th>
                    ))}
                    <th className="p-2 bg-bg-muted text-center text-sm font-medium text-text-secondary border border-border w-20">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {daysWithData.map(day => (
                    <tr key={day}>
                      <td className="p-2 bg-bg-muted font-medium text-text-primary border border-border">
                        {DAY_LABELS[day]}
                      </td>
                      {Array.from({ length: maxPeriods }, (_, i) => {
                        const isEditing = editingCell?.day === day && editingCell?.period === i;
                        const value = editableData.timetable[day][i] || '';
                        const hasPeriod = i < editableData.days[day].totalPeriods;

                        // Empty cell if day doesn't have this period
                        if (!hasPeriod) {
                          return (
                            <td key={i} className="p-2 bg-bg-secondary border border-border text-center">
                              <span className="text-text-muted text-xs">-</span>
                            </td>
                          );
                        }

                        // Editing mode
                        if (isEditing) {
                          return (
                            <td key={i} className="p-1 border border-border bg-accent/10">
                              <div className="flex items-center gap-1">
                                <input
                                  type="text"
                                  value={editValue}
                                  onChange={e => setEditValue(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveEdit();
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  className="flex-1 px-2 py-1 text-sm bg-bg-primary border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
                                  autoFocus
                                  placeholder="Subject name"
                                />
                                <button
                                  onClick={saveEdit}
                                  className="p-1 text-success hover:bg-success/10 rounded"
                                  title="Save (Enter)"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={cancelEdit}
                                  className="p-1 text-danger hover:bg-danger/10 rounded"
                                  title="Cancel (Escape)"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          );
                        }

                        // Display mode
                        return (
                          <td
                            key={i}
                            onClick={() => startEditing(day, i)}
                            className="p-2 border border-border cursor-pointer hover:bg-bg-muted group"
                          >
                            <div className="flex items-center justify-between">
                              <span className={`text-sm ${value ? 'text-text-primary' : 'text-text-muted italic'}`}>
                                {value || 'Empty'}
                              </span>
                              <Edit2 className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100" />
                            </div>
                          </td>
                        );
                      })}
                      <td className="p-2 border border-border">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => addPeriod(day)}
                            className="p-1 text-success hover:bg-success/10 rounded"
                            title="Add period"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          {editableData.days[day].totalPeriods > 0 && (
                            <button
                              onClick={() => removePeriod(day, editableData.days[day].totalPeriods - 1)}
                              className="p-1 text-danger hover:bg-danger/10 rounded"
                              title="Remove last period"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-text-muted">No timetable data detected. Add days manually:</p>
            </div>
          )}

          {/* Add Day Buttons */}
          {availableDays.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-text-secondary mb-2">Add day:</p>
              <div className="flex flex-wrap gap-2">
                {availableDays.map(day => (
                  <button
                    key={day}
                    onClick={() => addDay(day)}
                    className="px-3 py-1 text-sm bg-bg-muted hover:bg-border rounded-lg text-text-primary flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {DAY_LABELS[day]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Subject Summary */}
          {allSubjects.length > 0 && (
            <div className="mt-4 p-3 bg-bg-muted rounded-lg">
              <p className="text-sm font-medium text-text-secondary mb-2">
                Detected Subjects ({allSubjects.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {allSubjects.map(subject => {
                  const isNew = !existingSubjects.some(
                    s => s.name.toUpperCase() === subject.toUpperCase()
                  );
                  return (
                    <span
                      key={subject}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        isNew
                          ? 'bg-success/20 text-success'
                          : 'bg-accent/20 text-accent'
                      }`}
                    >
                      {subject}
                      {isNew && ' (new)'}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 p-4 border-t border-border flex-shrink-0">
          <Button variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex-1" disabled={allSubjects.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            Confirm & Save
          </Button>
        </div>
      </div>
    </div>
  );
};
