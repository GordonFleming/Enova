from aldryn_client import forms

class Form(forms.BaseForm):

	def to_settings(self, data, settings):

		settings['TEMPLATE_CONTEXT_PROCESSORS'].append('wagtailmenus.context_processors.wagtailmenus')
		return settings