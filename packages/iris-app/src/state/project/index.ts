import { useEffect } from "react";

import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { useDispatch, useSelector } from "react-redux";

import { AppThunk, RootState } from "src/store";
import API from "src/util/api";
import { fetcher } from "src/util/fetcher";

const appstaticAPI = new API();

export const sync = (action: any): AppThunk => async (dispatch, getState) => {
  dispatch({ type: "project/incrementSaving" });
  dispatch(action);
  try {
    const state = getState();
    console.log(state);
    // TODO: persist state;
    // TODO: emit socket message;
    dispatch({ type: "project/decrementSaving" });
  } catch (err) {
    dispatch({ type: "project/decrementSaving" });
  }
};

const load = createAsyncThunk(
  "project/load",
  async (projectID: string, _thunkAPI) => {
    const command = appstaticAPI.endpoint("/api/projects/:id", {
      path: {
        id: projectID,
      },
    });
    const response = await fetcher(command as string);
    return response;
  }
);

export function useProject(id: string) {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(load(id));
  }, [dispatch, id]);

  return useSelector((state: RootState) => state.project);
}

interface UI {
  selectedTool: string;
  selectedCategory: string;
  selectedImages: string[];
  highlightedBox?: string;
  intermediateBox?: Annotation;
}

export interface Annotation {
  id: string;
  label: string;
  x: number;
  x2: number;
  y: number;
  y2: number;
}

interface Annotations {
  [key: string]: Annotation[];
}

interface ProjectState {
  status: "idle" | "pending" | "success" | "error";
  saving: number;
  id?: string;
  name?: string;
  created?: string;
  error?: any;
  categories?: string[];
  annotations?: Annotations;
  ui?: UI;
}

const initialState: ProjectState = { saving: 0, status: "idle" };

const projectSlice = createSlice({
  name: "project",
  initialState,
  reducers: {
    addCategory(state, { payload }) {
      if (state.categories === undefined) {
        state.categories = [];
      }
      if (!state.categories.includes(payload)) {
        state.categories.push(payload);
      }
    },
    deleteCategory(state, { payload }) {
      // find and remove category
      if (state.categories !== undefined) {
        const labelIndex = state.categories.findIndex((c) => c === payload);
        state.categories.splice(labelIndex, 1);
      }

      if (state.annotations !== undefined) {
        // NOTE: What if someone deletes a category right as we label something
        // as the deleted category?
        // it should work out as long as we make sure to recreate the category
        // when creating the annotation.
        for (const [key, val] of Object.entries(state.annotations)) {
          // Remove annotations without annotations.
          state.annotations[key] = val.filter((a) => a.label !== payload);
          // Remove images without annotations.
          if (state.annotations[key].length === 0) {
            delete state.annotations[key];
          }
        }
      }
    },
    addImages(_state, _action) {
      // TODO
      // const imageNames = payload.map((image) => image.name);
      // state.images = [...new Set([...imageNames, ...state.images])];
    },
    deleteImages(_state, _action) {
      // TODO
      // images.forEach((image) => {
      //   state.images.splice(
      //     state.images.findIndex((i) => i === image),
      //     1
      //   );
      //   // TODO: This could possibly cause an undefined error if someone deletes
      //   // an image when someone else adds a box to the image. We should check
      //   // if the image exists in `createBox` and `deleteBox`
      //   delete draft.annotations[image];
      // });
    },
    addAnnotations(state, { payload }) {
      console.log("ADD ANNOTATON", payload);
      if (state.annotations === undefined) {
        state.annotations = {};
      }
      // add annotation to images
      for (const image of payload.images) {
        if (state.annotations[image] === undefined) {
          state.annotations[image] = [];
        }
        state.annotations[image].unshift(payload.annotation);
      }
      if (state.categories === undefined) {
        state.categories = [];
      }
      // create categories if it doesn't exist for some reason
      if (!state.categories.includes(payload.annotation.label)) {
        state.categories.push(payload.annotation.label);
      }
    },
    deleteAnnotations(state, { payload }) {
      if (state.annotations !== undefined) {
        for (const image of payload.images) {
          const annotationIndex = state.annotations[image].findIndex((a) => {
            return a.id === payload.annotation.id;
          });
          state.annotations[image].splice(annotationIndex, 1);

          // remove image if it doesn't have any annotations
          if (state.annotations[image].length === 0) {
            delete state.annotations[image];
          }
        }
      }
    },
    incrementSaving(state) {
      state.saving += 1;
    },
    decrementSaving(state) {
      state.saving -= 1;
    },
    selectTool(state, { payload }) {
      if (state.ui !== undefined) {
        state.ui.selectedTool = payload;
      }
    },
    selectCategory(state, { payload }) {
      if (state.ui !== undefined) {
        state.ui.selectedCategory = payload;
      }
    },
    selectImages(state, { payload }) {
      if (state.ui !== undefined) {
        state.ui.selectedImages = [payload];
      }
    },
    toggleSelectedImage(state, { payload }) {
      if (state.ui !== undefined) {
        const rangeHasImage = state.ui.selectedImages.includes(payload);

        // Add or remove the new image.
        const newRange = rangeHasImage
          ? state.ui.selectedImages.filter((i) => i !== payload)
          : [payload, ...state.ui.selectedImages];

        state.ui.selectedImages = newRange;
      }
    },
    highlightBox(state, { payload }) {
      if (state.ui !== undefined) {
        state.ui.highlightedBox = payload;
      }
    },
    setIntermediateBox(state, { payload }) {
      if (state.ui !== undefined) {
        state.ui.intermediateBox = payload;
      }
    },
  },
  extraReducers: (builder) => {
    builder.addCase(load.pending, (_state, _action) => {
      return {
        status: "pending",
        saving: 0,
      };
    });
    builder.addCase(load.fulfilled, (_state, { payload }) => {
      const firstImage = Object.keys(payload.annotations.annotations)[0];
      return {
        status: "success",
        saving: 0,
        id: payload.id,
        name: payload.name,
        created: payload.created,
        categories: payload.annotations.labels,
        annotations: payload.annotations.annotations,
        ui: {
          selectedTool: "rect",
          selectedCategory: payload.annotations.labels[0],
          selectedImages: [firstImage],
        },
      };
    });
    builder.addCase(load.rejected, (_state, { payload }) => {
      return {
        status: "error",
        saving: 0,
        error: payload,
      };
    });
  },
});

export default projectSlice.reducer;