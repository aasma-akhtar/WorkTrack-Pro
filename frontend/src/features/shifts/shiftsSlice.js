import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchShifts = createAsyncThunk(
  'shifts/fetchShifts',
  async ({ token }, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/shifts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || 'Failed to fetch shifts');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch shifts');
    }
  }
);

export const fetchShiftEmployees = createAsyncThunk(
  'shifts/fetchShiftEmployees',
  async ({ token }, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/auth/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || 'Failed to fetch employees');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch employees');
    }
  }
);

export const fetchTeamAssignments = createAsyncThunk(
  'shifts/fetchTeamAssignments',
  async ({ token }, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/shifts/team-shifts', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || 'Failed to fetch team assignments');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch team assignments');
    }
  }
);

const shiftsSlice = createSlice({
  name: 'shifts',
  initialState: {
    shifts: [],
    employees: [],
    teamAssignments: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchShifts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShifts.fulfilled, (state, action) => {
        state.loading = false;
        state.shifts = action.payload;
      })
      .addCase(fetchShifts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchShiftEmployees.fulfilled, (state, action) => {
        state.employees = action.payload;
      })
      .addCase(fetchTeamAssignments.fulfilled, (state, action) => {
        state.teamAssignments = action.payload;
      });
  },
});

export default shiftsSlice.reducer;
