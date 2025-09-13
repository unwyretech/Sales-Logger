import React, { useState, useEffect } from 'react';
import { Users, Shield, Check, X, Settings, Trash2, Plus, Edit, Save, UserX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../hooks/useDatabase';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'super_admin' | 'admin' | 'standard';
  is_approved: boolean;
  created_at: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string | null;
  color: string;
  is_active: boolean;
}

interface UserPermission {
  id: string;
  user_id: string;
  campaign_id: string;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  user_email?: string;
  campaign_name?: string;
}

export function AdminPanel() {
  const { isSuperAdmin } = useAuth();
  const { campaigns, campaignTeams, createCampaign, updateCampaign, deleteCampaign, createCampaignTeam, updateCampaignTeam, deleteCampaignTeam } = useDatabase();
  const [activeTab, setActiveTab] = useState<'users' | 'permissions' | 'settings'>('users');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddCampaign, setShowAddCampaign] = useState(false);
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<string | null>(null);
  const [newCampaign, setNewCampaign] = useState({ name: '', description: '', color: '#3b82f6' });
  const [newTeam, setNewTeam] = useState({ name: '', campaign_id: '', color: '#10b981' });
  const [showAddPermission, setShowAddPermission] = useState(false);
  const [newPermission, setNewPermission] = useState({ user_id: '', campaign_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [usersResult, permissionsResult] = await Promise.all([
        supabase.from('user_profiles').select('*').order('created_at', { ascending: false }),
        supabase
          .from('user_permissions')
          .select(`
            *,
            user_profiles!inner(email),
            campaigns!inner(name)
          `)
      ]);

      if (usersResult.data) setUsers(usersResult.data);
      if (permissionsResult.data) {
        const formattedPermissions = permissionsResult.data.map(p => ({
          ...p,
          user_email: (p as any).user_profiles.email,
          campaign_name: (p as any).campaigns.name
        }));
        setPermissions(formattedPermissions);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserApproval = async (userId: string, isApproved: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_approved: isApproved })
        .eq('user_id', userId);

      if (error) throw error;
      
      setUsers(prev => prev.map(user => 
        user.user_id === userId ? { ...user, is_approved: isApproved } : user
      ));
    } catch (error) {
      console.error('Error updating user approval:', error);
    }
  };

  const updateUserRole = async (userId: string, role: 'super_admin' | 'admin' | 'standard') => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role })
        .eq('user_id', userId);

      if (error) throw error;
      
      setUsers(prev => prev.map(user => 
        user.user_id === userId ? { ...user, role } : user
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
    }
  };

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This will permanently remove their account and all associated data.')) return;
    
    try {
      // Delete user permissions first
      await supabase.from('user_permissions').delete().eq('user_id', userId);
      
      // Delete user profile
      await supabase.from('user_profiles').delete().eq('user_id', userId);
      
      // Delete from auth.users (this requires service role key in production)
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) {
        console.warn('Could not delete auth user:', error);
      }
      
      setUsers(prev => prev.filter(user => user.user_id !== userId));
      fetchData(); // Refresh permissions data
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user. They may need to be removed manually from the auth system.');
    }
  };

  const createUserPermission = async (userId: string, campaignId: string) => {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .insert({
          user_id: userId,
          campaign_id: campaignId,
          can_view: true,
          can_edit: false,
          can_delete: false
        });

      if (error) throw error;
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error creating user permission:', error);
    }
  };

  const updatePermission = async (permissionId: string, updates: Partial<UserPermission>) => {
    try {
      const { error } = await supabase
        .from('user_permissions')
        .update(updates)
        .eq('id', permissionId);

      if (error) throw error;
      
      setPermissions(prev => prev.map(perm => 
        perm.id === permissionId ? { ...perm, ...updates } : perm
      ));
    } catch (error) {
      console.error('Error updating permission:', error);
    }
  };

  const handleAddPermission = async () => {
    if (!newPermission.user_id || !newPermission.campaign_id) return;
    
    try {
      await createUserPermission(newPermission.user_id, newPermission.campaign_id);
      setNewPermission({ user_id: '', campaign_id: '' });
      setShowAddPermission(false);
    } catch (error) {
      console.error('Error creating permission:', error);
    }
  };

  const deletePermission = async (permissionId: string) => {
    if (!confirm('Are you sure you want to remove this permission?')) return;
    
    try {
      const { error } = await supabase
        .from('user_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;
      
      setPermissions(prev => prev.filter(perm => perm.id !== permissionId));
    } catch (error) {
      console.error('Error deleting permission:', error);
    }
  };

  const handleAddCampaign = async () => {
    if (!newCampaign.name) return;
    
    try {
      await createCampaign(newCampaign);
      setNewCampaign({ name: '', description: '', color: '#3b82f6' });
      setShowAddCampaign(false);
    } catch (error) {
      console.error('Error creating campaign:', error);
    }
  };

  const handleAddTeam = async () => {
    if (!newTeam.name || !newTeam.campaign_id) return;
    
    try {
      await createCampaignTeam(newTeam);
      setNewTeam({ name: '', campaign_id: '', color: '#10b981' });
      setShowAddTeam(false);
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign? This will also delete all associated teams and data.')) return;
    
    try {
      await deleteCampaign(campaignId);
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    
    try {
      await deleteCampaignTeam(teamId);
    } catch (error) {
      console.error('Error deleting team:', error);
    }
  };

  const clearAllData = async () => {
    if (!confirm('Are you sure you want to clear ALL data? This action cannot be undone.')) {
      return;
    }

    try {
      await Promise.all([
        supabase.from('call_data').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('agent_notes').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('agents').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('campaign_teams').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('campaigns').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      ]);
      
      alert('All data cleared successfully');
      fetchData();
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Error clearing data');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center">
          <Shield className="w-6 h-6 mr-2 text-blue-600" />
          Admin Panel
        </h2>
        <p className="text-gray-600 mt-1">Manage users, permissions, and system settings</p>
      </div>

      {/* Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
        {[
          { id: 'users', label: 'User Management', icon: Users },
          { id: 'permissions', label: 'Permissions', icon: Shield },
          { id: 'settings', label: 'Campaigns & Settings', icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* User Management Tab */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
            <p className="text-gray-600">Approve users and manage their roles</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">User</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Role</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Created</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{user.full_name || 'No name'}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.user_id, e.target.value as any)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        disabled={!isSuperAdmin}
                      >
                        <option value="standard">Standard User</option>
                        <option value="admin">Admin User</option>
                        {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        user.is_approved 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {user.is_approved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        {!user.is_approved && (
                          <button
                            onClick={() => updateUserApproval(user.user_id, true)}
                            className="text-green-600 hover:text-green-800"
                            title="Approve User"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        {user.is_approved && user.role !== 'super_admin' && (
                          <button
                            onClick={() => updateUserApproval(user.user_id, false)}
                            className="text-red-600 hover:text-red-800"
                            title="Revoke Approval"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => deleteUser(user.user_id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete User"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Campaign Permissions</h3>
                <p className="text-gray-600">Manage user access to campaigns</p>
              </div>
              <button
                onClick={() => setShowAddPermission(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Permission</span>
              </button>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {permissions.map((permission) => (
                <div key={permission.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium text-gray-900">{permission.user_email}</div>
                      <div className="text-sm text-gray-600">{permission.campaign_name}</div>
                    </div>
                    <button
                      onClick={() => deletePermission(permission.id)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove Permission"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permission.can_view}
                        onChange={(e) => updatePermission(permission.id, { can_view: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Can View</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permission.can_edit}
                        onChange={(e) => updatePermission(permission.id, { can_edit: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Can Edit</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={permission.can_delete}
                        onChange={(e) => updatePermission(permission.id, { can_delete: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm text-gray-700">Can Delete</span>
                    </label>
                  </div>
                </div>
              ))}
              
              {permissions.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No permissions configured yet</p>
                  <p className="text-sm text-gray-500">Add permissions to grant users access to specific campaigns</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Campaigns & System Settings</h3>
            <p className="text-gray-600">Manage campaigns, teams, and system-wide settings</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-6">
              {/* Campaign Management */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Campaign Management</h4>
                  <button
                    onClick={() => setShowAddCampaign(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Campaign</span>
                  </button>
                </div>
                
                <div className="space-y-2">
                  {campaigns.map(campaign => (
                    <div key={campaign.id} className="flex items-center justify-between p-3 border border-gray-100 rounded">
                      {editingCampaign === campaign.id ? (
                        <div className="flex items-center space-x-2 flex-1">
                          <input
                            type="text"
                            defaultValue={campaign.name}
                            className="border border-gray-300 rounded px-2 py-1 text-sm"
                            onBlur={(e) => {
                              updateCampaign(campaign.id, { name: e.target.value });
                              setEditingCampaign(null);
                            }}
                          />
                          <input
                            type="color"
                            defaultValue={campaign.color}
                            className="w-8 h-8 border border-gray-300 rounded"
                            onChange={(e) => updateCampaign(campaign.id, { color: e.target.value })}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center space-x-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: campaign.color }} />
                          <span className="font-medium">{campaign.name}</span>
                          <span className="text-sm text-gray-500">
                            ({campaignTeams.filter(t => t.campaign_id === campaign.id).length} teams)
                          </span>
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        {editingCampaign === campaign.id ? (
                          <button
                            onClick={() => setEditingCampaign(null)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingCampaign(campaign.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Team Management */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-900">Team Management</h4>
                  <button
                    onClick={() => setShowAddTeam(true)}
                    className="flex items-center space-x-2 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Team</span>
                  </button>
                </div>
                
                <div className="space-y-2">
                  {campaignTeams.map(team => {
                    const campaign = campaigns.find(c => c.id === team.campaign_id);
                    return (
                      <div key={team.id} className="flex items-center justify-between p-3 border border-gray-100 rounded">
                        {editingTeam === team.id ? (
                          <div className="flex items-center space-x-2 flex-1">
                            <input
                              type="text"
                              defaultValue={team.name}
                              className="border border-gray-300 rounded px-2 py-1 text-sm"
                              onBlur={(e) => {
                                updateCampaignTeam(team.id, { name: e.target.value });
                                setEditingTeam(null);
                              }}
                            />
                            <input
                              type="color"
                              defaultValue={team.color}
                              className="w-8 h-8 border border-gray-300 rounded"
                              onChange={(e) => updateCampaignTeam(team.id, { color: e.target.value })}
                            />
                          </div>
                        ) : (
                          <div className="flex items-center space-x-3">
                            <div className="w-4 h-4 rounded" style={{ backgroundColor: team.color }} />
                            <span className="font-medium">{team.name}</span>
                            <span className="text-sm text-gray-500">({campaign?.name})</span>
                          </div>
                        )}
                        
                        <div className="flex space-x-2">
                          {editingTeam === team.id ? (
                            <button
                              onClick={() => setEditingTeam(null)}
                              className="text-green-600 hover:text-green-800"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => setEditingTeam(team.id)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteTeam(team.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border border-red-200 rounded-lg p-4 bg-red-50">
                <h4 className="font-medium text-red-900 mb-2">Danger Zone</h4>
                <p className="text-sm text-red-700 mb-4">
                  This action will permanently delete all campaigns, teams, agents, and call data. This cannot be undone.
                </p>
                <button
                  onClick={clearAllData}
                  className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Clear All Data</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Campaign Modal */}
      {showAddCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Campaign</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  value={newCampaign.color}
                  onChange={(e) => setNewCampaign(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddCampaign}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Campaign
              </button>
              <button
                onClick={() => setShowAddCampaign(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Modal */}
      {showAddTeam && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Team</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
                <select
                  value={newTeam.campaign_id}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, campaign_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Campaign</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="color"
                  value={newTeam.color}
                  onChange={(e) => setNewTeam(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full h-10 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddTeam}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
              >
                Add Team
              </button>
              <button
                onClick={() => setShowAddTeam(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Permission Modal */}
      {showAddPermission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Campaign Permission</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select
                  value={newPermission.user_id}
                  onChange={(e) => setNewPermission(prev => ({ ...prev, user_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select User</option>
                  {users.filter(user => user.is_approved).map(user => (
                    <option key={user.user_id} value={user.user_id}>
                      {user.full_name || user.email} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
                <select
                  value={newPermission.campaign_id}
                  onChange={(e) => setNewPermission(prev => ({ ...prev, campaign_id: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select Campaign</option>
                  {campaigns.map(campaign => (
                    <option key={campaign.id} value={campaign.id}>{campaign.name}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={handleAddPermission}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Permission
              </button>
              <button
                onClick={() => setShowAddPermission(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}