import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export const fetchMyLeaves = createAsyncThunk(
  'leaves/fetchMyLeaves',
  async ({ token }, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/leaves/my-leaves', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || 'Failed to fetch my leaves');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch my leaves');
    }
  }
);

export const fetchPendingLeaves = createAsyncThunk(
  'leaves/fetchPendingLeaves',
  async ({ token }, { rejectWithValue }) => {
    try {
      const res = await fetch('/api/leaves/pending', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        return rejectWithValue(data.message || 'Failed to fetch pending leaves');
      }

      return data;
    } catch (error) {
      return rejectWithValue(error.message || 'Failed to fetch pending leaves');
    }
  }
);

const leavesSlice = createSlice({
  name: 'leaves',
  initialState: {
    myLeaves: [],
    pendingLeaves: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyLeaves.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMyLeaves.fulfilled, (state, action) => {
        state.loading = false;
        state.myLeaves = action.payload;
      })
      .addCase(fetchMyLeaves.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchPendingLeaves.fulfilled, (state, action) => {
        state.pendingLeaves = action.payload;
      });
  },
});

export default leavesSlice.reducer;
