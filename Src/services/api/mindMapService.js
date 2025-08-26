import {supabase} from '../../../supabase';

export const mindMapService = {
  // Save complete mind map data (nodes + connections + positions)
  async saveMindMapData(plannerTaskId, mindMapData) {
    try {
      const dataToSave = {
        nodes: mindMapData.nodes,
        connections: mindMapData.connections,
        nodeIdMapping: Array.from(mindMapData.nodeIdMapping.entries()),
        lastUpdated: new Date().toISOString(),
        version: '1.0',
      };

      // First check if mindmap data exists
      const {data: existing, error: fetchError} = await supabase
        .from('mindmap_data')
        .select('id')
        .eq('planner_task_id', plannerTaskId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      let result;
      if (existing) {
        // Update existing
        const {data, error} = await supabase
          .from('mindmap_data')
          .update({
            mindmap_json: dataToSave,
            updated_at: new Date().toISOString()
          })
          .eq('planner_task_id', plannerTaskId)
          .select();

        if (error) throw error;
        result = data[0];
      } else {
        // Create new
        const {data, error} = await supabase
          .from('mindmap_data')
          .insert([{
            planner_task_id: plannerTaskId,
            mindmap_json: dataToSave
          }])
          .select();

        if (error) throw error;
        result = data[0];
      }

      console.log('Mind map data saved successfully');
      return result;
    } catch (error) {
      console.error('Error saving mind map data:', error);
      throw error;
    }
  },

  // Load complete mind map data
  async loadMindMapData(plannerTaskId) {
    try {
      const {data, error} = await supabase
        .from('mindmap_data')
        .select('*')
        .eq('planner_task_id', plannerTaskId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No data found
          return null;
        }
        throw error;
      }

      const mindMapData = data.mindmap_json;
      
      // Convert nodeIdMapping back to Map
      if (mindMapData.nodeIdMapping) {
        mindMapData.nodeIdMapping = new Map(mindMapData.nodeIdMapping);
      }

      console.log('Mind map data loaded successfully');
      return mindMapData;
    } catch (error) {
      console.error('Error loading mind map data:', error);
      throw error;
    }
  },

  // Delete mind map data
  async deleteMindMapData(plannerTaskId) {
    try {
      const {error} = await supabase
        .from('mindmap_data')
        .delete()
        .eq('planner_task_id', plannerTaskId);

      if (error) throw error;

      console.log('Mind map data deleted successfully');
      return true;
    } catch (error) {
      console.error('Error deleting mind map data:', error);
      throw error;
    }
  },

  // LEGACY METHODS - Keep these for backward compatibility if needed
  // Create a new mind map node
  async createMindMapNode(nodeData) {
    try {
      const {data, error} = await supabase
        .from('mindmap_nodes')
        .insert([
          {
            planner_task_id: nodeData.plannerTaskId,
            parent_id: nodeData.parentId || null,
            node_name: nodeData.nodeName,
            notes: nodeData.notes || null,
          },
        ])
        .select();

      if (error) {
        console.error('Error creating mind map node:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in createMindMapNode:', error);
      throw error;
    }
  },

  // Get all mind map nodes for a specific planner task
  async getMindMapNodes(plannerTaskId) {
    try {
      const {data, error} = await supabase
        .from('mindmap_nodes')
        .select('*')
        .eq('planner_task_id', plannerTaskId)
        .order('created_at', {ascending: true});

      if (error) {
        console.error('Error fetching mind map nodes:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error in getMindMapNodes:', error);
      throw error;
    }
  },

  // Update a mind map node
  async updateMindMapNode(nodeId, nodeData) {
    try {
      const updateData = {};
      
      if (nodeData.nodeName !== undefined) {
        updateData.node_name = nodeData.nodeName;
      }
      if (nodeData.notes !== undefined) {
        updateData.notes = nodeData.notes;
      }
      if (nodeData.parentId !== undefined) {
        updateData.parent_id = nodeData.parentId;
      }

      const {data, error} = await supabase
        .from('mindmap_nodes')
        .update(updateData)
        .eq('id', nodeId)
        .select();

      if (error) {
        console.error('Error updating mind map node:', error);
        throw error;
      }

      return data[0];
    } catch (error) {
      console.error('Error in updateMindMapNode:', error);
      throw error;
    }
  },

  // Delete a mind map node
  async deleteMindMapNode(nodeId) {
    try {
      const {error} = await supabase
        .from('mindmap_nodes')
        .delete()
        .eq('id', nodeId);

      if (error) {
        console.error('Error deleting mind map node:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteMindMapNode:', error);
      throw error;
    }
  }
};