import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchTodayStatus = createAsyncThunk(
  'attendance/fetchTodayStatus',
  async ({ token, userRole }, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/dashboard/summary', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || 'Failed to fetch today status');
      }

      return userRole === 'employee' ? data.todayStatus : null;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch today status');
    }
  }
);

export const fetchEmployees = createAsyncThunk(
  'attendance/fetchEmployees',
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

export const fetchAttendanceHistory = createAsyncThunk(
  'attendance/fetchHistory',
  async ({ token, userRole, filterEmployeeId, filterStartDate, filterEndDate }, { rejectWithValue }) => {
    try {
      let url = '/api/attendance/my-history';

      if (userRole !== 'employee') {
        const params = [];
        if (filterEmployeeId) params.push(`employeeId=${filterEmployeeId}`);
        if (filterStartDate) params.push(`startDate=${filterStartDate}`);
        if (filterEndDate) params.push(`endDate=${filterEndDate}`);
        url = `/api/attendance/team-history?${params.join('&')}`;
      }

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || 'Failed to fetch attendance history');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch attendance history');
    }
  }
);

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    todayStatus: null,
    history: [],
    employees: [],
    loading: false,
    historyLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTodayStatus.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTodayStatus.fulfilled, (state, action) => {
        state.loading = false;
        state.todayStatus = action.payload;
      })
      .addCase(fetchTodayStatus.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.employees = action.payload;
      })
      .addCase(fetchAttendanceHistory.pending, (state) => {
        state.historyLoading = true;
        state.error = null;
      })
      .addCase(fetchAttendanceHistory.fulfilled, (state, action) => {
        state.historyLoading = false;
        state.history = action.payload;
      })
      .addCase(fetchAttendanceHistory.rejected, (state, action) => {
        state.historyLoading = false;
        state.error = action.payload;
      });
  },
});

export default attendanceSlice.reducer;
