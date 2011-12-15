require 'rake'
require 'pdoc'

ROOT_DIR = File.dirname(__FILE__)
DOC_OUTPUT_DIR = File.join(ROOT_DIR, '../BOT-docs')

namespace :pdoc do
  desc "Builds the documentation"
  task :build_doc do
    source_files = []
    Dir.glob(File.join(ROOT_DIR, "*.js")).each do |path|
      source_files << path
    end
    
    # Copy in the project README file
    puts "Copying README.md and MIT-LICENSE.txt"
    files = ['README.md', 'MIT-LICENSE.txt']
    files.each do |file|
      File.open(File.join(ROOT_DIR, file), 'r') do |reader|
        File.open(File.join(DOC_OUTPUT_DIR, file), 'w') do |writer|
          writer.write(reader.read)
        end
      end
    end
    
    PDoc.run({
      :source_files => source_files,
      :destination => DOC_OUTPUT_DIR,
      :syntax_highlighter => :pygments,
      :markdown_parser => :bluecloth,
      :src_code_href => proc { |model|
        file_name = model.file.gsub(ROOT_DIR, '')
        file_name = file_name[1, file_name.length - 1]
        "http://github.com/bradfordcp/BOT/blob/master/#{file_name}#L#{model.line_number}"
      },
      :pretty_urls => false,
      :bust_cache => true,
      :name => 'Node XMPP Client / Bot Framework',
      :short_name => 'BOT',
      :home_url => 'https://github.com/bradfordcp/BOT',
      :doc_url => 'http://bradfordcp.github.com/BOT/',
      :version => "0.1.0",
      :copyright_notice => 'This work is licensed under the <a rel="license" href="https://github.com/bradfordcp/BOT/blob/master/MIT-LICENSE.txt">MIT License</a>.' 
    })
  end

  desc "Empties output directory"
  task :remove_doc do
    rm_rf Dir.glob(File.join(DOC_OUTPUT_DIR, "*"))
  end

  desc "Empties the output directory and builds the documentation."
  task :doc => [:remove_doc, :build_doc]

  desc "Runs all the unit tests."
  task :test do 
    require 'rake/runtest'
    Rake.run_tests '**/*_test.rb'
  end

  task :compile_parser do
    require 'treetop'
    compiler = Treetop::Compiler::GrammarCompiler.new
    treetop_dir = File.expand_path(File.join(File.dirname(__FILE__), "lib", "pdoc", "parser", "treetop_files"))
    Dir.glob(File.join(treetop_dir, "*.treetop")).each do |treetop_file_path|
      compiler.compile(treetop_file_path)
    end
  end
end

desc 'Run Tests through Jasmine'
task :test do
  output = `cd #{ROOT_DIR}; #{dir}/node_modules/jasmine-node/bin/jasmine-node spec`
  puts output
end
